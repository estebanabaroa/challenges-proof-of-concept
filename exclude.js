const TinyCache = require('tinycache')
const QuickLRU = require('quick-lru')
const {RateLimiter} = require('limiter')

// e.g. secondsToGoBack = 60 would return the timestamp 1 minute ago
const getTimestampSecondsAgo = (secondsToGoBack) => Math.round(Date.now() / 1000) - secondsToGoBack

const testScore = (excludeScore, authorScore) => excludeScore === undefined || excludeScore <= (authorScore || 0)
// firstCommentTimestamp value first needs to be put through Date.now() - firstCommentTimestamp
const testFirstCommentTimestamp = (excludeTime, authorFirstCommentTimestamp) => excludeTime === undefined || getTimestampSecondsAgo(excludeTime) >= (authorFirstCommentTimestamp || Infinity)

const isVote = (publication) => publication.vote !== undefined && publication.commentCid
const isReply = (publication) => publication.parentCid && !publication.commentCid
const isPost = (publication) => !publication.parentCid && !publication.commentCid
const testIs = (excludePublicationType, publication, isFunction) => {
  if (excludePublicationType === undefined) return true
  if (excludePublicationType === true) {
    if (isFunction(publication)) return true
    else return false
  }
  if (excludePublicationType === false) {
    if (isFunction(publication)) return false
    else return true
  }
  // excludePublicationType is invalid, return true
  return true
}
const testVote = (excludeVote, publication) => testIs(excludeVote, publication, isVote)
const testReply = (excludeReply, publication) => testIs(excludeReply, publication, isReply)
const testPost = (excludePost, publication) => testIs(excludePost, publication, isPost)

const rateLimiters = new QuickLRU({maxSize: 10000})
const getRateLimiterName = (exclude, publication, publicationType, challengeSuccess) => `${publication.author.address}-${exclude.rateLimit}-${publicationType}-${challengeSuccess}`
const getOrCreateRateLimiter = (exclude, publication, publicationType, challengeSuccess) => {
  const rateLimiterName = getRateLimiterName(exclude, publication, publicationType, challengeSuccess)
  let rateLimiter = rateLimiters.get(rateLimiterName)
  if (!rateLimiter) {
    rateLimiter = new RateLimiter({tokensPerInterval: exclude.rateLimit, interval: "hour", fireImmediately: true})
    rateLimiter.name = rateLimiterName // add name for debugging
    rateLimiters.set(rateLimiterName, rateLimiter)
  }
  return rateLimiter
}
const addFilteredRateLimiter = (exclude, publication, publicationType, challengeSuccess, filteredRateLimiters) => {
  filteredRateLimiters[getRateLimiterName(exclude, publication, publicationType, challengeSuccess)] = getOrCreateRateLimiter(exclude, publication, publicationType, challengeSuccess)
}

const getRateLimitersToTest = (exclude, publication, challengeSuccess) => {
  // get all rate limiters associated with the exclude (publication type and challengeSuccess true/false)
  const filteredRateLimiters = {}
  if (testPost(exclude.post, publication) && ![exclude.reply, exclude.vote].includes(true)) {
    addFilteredRateLimiter(exclude, publication, 'post', challengeSuccess, filteredRateLimiters)
  }
  if (testReply(exclude.reply, publication) && ![exclude.post, exclude.vote].includes(true)) {
    addFilteredRateLimiter(exclude, publication, 'reply', challengeSuccess, filteredRateLimiters)
  }
  if (testVote(exclude.vote, publication) && ![exclude.post, exclude.reply].includes(true)) {
    addFilteredRateLimiter(exclude, publication, 'vote', challengeSuccess, filteredRateLimiters)
  }

  return filteredRateLimiters
}

const testRateLimit = (exclude, publication) => {
  if (
    exclude?.rateLimit === undefined ||
    (exclude.post === true && !isPost(publication)) ||
    (exclude.reply === true && !isReply(publication)) ||
    (exclude.vote === true && !isVote(publication)) ||
    (exclude.post === false && isPost(publication)) ||
    (exclude.reply === false && isReply(publication)) ||
    (exclude.vote === false && isVote(publication))
  ) {
    // early exit based on exclude type and publication type
    return true
  }

  // if rateLimitChallengeSuccess is undefined or true, only use {challengeSuccess: true} rate limiters
  let challengeSuccess = true
  if (exclude.rateLimitChallengeSuccess === false) {
    challengeSuccess = false
  }

  // check all the rate limiters that match the exclude and publication type
  const rateLimiters = getRateLimitersToTest(exclude, publication, challengeSuccess)
  // if any of the matching rate limiter is out of tokens, test failed
  for (const rateLimiter of Object.values(rateLimiters)) {
    const tokensRemaining = rateLimiter.getTokensRemaining()
    // token per action is 1, so any value below 1 is invalid
    if (tokensRemaining < 1) {
      return false
    }
  }
  return true
}

const getRateLimitersToAddTo = (excludeArray, publication, challengeSuccess) => {
  // get all rate limiters associated with the exclude (publication type and challengeSuccess true/false)
  const filteredRateLimiters = {}
  for (const exclude of excludeArray) {
    if (exclude?.rateLimit === undefined) {
      continue
    }

    if (isPost(publication)) {
      addFilteredRateLimiter(exclude, publication, 'post', challengeSuccess, filteredRateLimiters)
    }
    if (isReply(publication)) {
      addFilteredRateLimiter(exclude, publication, 'reply', challengeSuccess, filteredRateLimiters)
    }
    if (isVote(publication)) {
      addFilteredRateLimiter(exclude, publication, 'vote', challengeSuccess, filteredRateLimiters)
    }
  }

  return filteredRateLimiters
}

const addToRateLimiter = (subplebbitChallenges, publication, challengeSuccess) => {
  if (!subplebbitChallenges) {
    // subplebbit has no challenges, no need to rate limit
    return
  }
  if (!Array.isArray(subplebbitChallenges)) {
    throw Error(`addToRateLimiter invalid argument subplebbitChallenges '${subplebbitChallenges}' not an array`)
  }
  if (typeof publication?.author?.address !== 'string') {
    throw Error(`addToRateLimiter invalid argument publication '${publication}'`)
  }
  if (typeof challengeSuccess !== 'boolean') {
    throw Error(`addToRateLimiter invalid argument challengeSuccess '${challengeSuccess}' not a boolean`)
  }

  // get all exclude items from all subplebbit challenges
  const excludeArray = []
  for (const subplebbitChallenge of subplebbitChallenges) {
    for (const exclude of subplebbitChallenge?.exclude || []) {
      excludeArray.push(exclude)
    }
  }

  if (!excludeArray.length) {
    // no need to add to rate limiter if the subplebbit has no exclude rules in any challenges
    return
  }

  const rateLimiters = getRateLimitersToAddTo(excludeArray, publication, challengeSuccess)
  for (const rateLimiter of Object.values(rateLimiters)) {
    rateLimiter.tryRemoveTokens(1)
  }
}

const shouldExcludePublication = (subplebbitChallenge, publication) => {
  if (!subplebbitChallenge || typeof subplebbitChallenge !== 'object') {
    throw Error(`shouldExcludePublication invalid subplebbitChallenge argument '${subplebbitChallenge}'`)
  }
  if (!publication?.author || typeof publication?.author !== 'object') {
    throw Error(`shouldExcludePublication invalid publication argument '${publication}'`)
  }
  const author = publication.author

  if (!subplebbitChallenge.exclude) {
    return false
  }
  if (!Array.isArray(subplebbitChallenge.exclude)) {
    throw Error(`shouldExcludePublication invalid subplebbitChallenge argument '${subplebbitChallenge}' subplebbitChallenge.exclude not an array`)
  }

  // if match any of the exclude array, should exclude
  for (const exclude of subplebbitChallenge.exclude) {
    // if doesn't have any author excludes, shouldn't exclude
    if (
      !exclude.postScore &&
      !exclude.replyScore &&
      !exclude.firstCommentTimestamp &&
      !exclude.address?.length &&
      exclude.post === undefined &&
      exclude.reply === undefined &&
      exclude.vote === undefined &&
      exclude.rateLimit === undefined
    ) {
      continue
    }

    // if match all of the exclude item properties, should exclude
    // keep separated for easier debugging
    let shouldExclude = true
    if (!testScore(exclude.postScore, author.subplebbit?.postScore)) {
      shouldExclude = false
    }
    if (!testScore(exclude.replyScore, author.subplebbit?.replyScore)) {
      shouldExclude = false
    }
    if (!testFirstCommentTimestamp(exclude.firstCommentTimestamp, author.subplebbit?.firstCommentTimestamp)) {
      shouldExclude = false
    }
    if (!testPost(exclude.post, publication)) {
      shouldExclude = false
    }
    if (!testReply(exclude.reply, publication)) {
      shouldExclude = false
    }
    if (!testVote(exclude.vote, publication)) {
      shouldExclude = false
    }
    if (!testRateLimit(exclude, publication)) {
      shouldExclude = false
    }
    if (exclude.address && !exclude.address.includes(author.address)) {
      shouldExclude = false
    }

    // if one of the exclude item is successful, should exclude author
    if (shouldExclude) {
      return true
    }
  }
  return false
}

const shouldExcludeChallengeSuccess = (subplebbitChallenge, challengeResults) => {
  if (!subplebbitChallenge || typeof subplebbitChallenge !== 'object') {
    throw Error(`shouldExcludeChallengeSuccess invalid subplebbitChallenge argument '${subplebbitChallenge}'`)
  }
  if (challengeResults && !Array.isArray(challengeResults)) {
    throw Error(`shouldExcludeChallengeSuccess invalid challengeResults argument '${challengeResults}'`)
  }

  // no challenge results or no exclude rules
  if (!challengeResults?.length || !subplebbitChallenge.exclude?.length) {
    return false
  }

  // if match any of the exclude array, should exclude
  for (const excludeItem of subplebbitChallenge.exclude) {

    // has no challenge success exclude rules
    if (!excludeItem.challenges?.length) {
      continue
    }

    // if any of exclude.challenges failed, don't exclude
    let shouldExclude = true
    for (const challengeIndex of excludeItem.challenges) {

      if (challengeResults[challengeIndex]?.success !== true) {
        // found a false, should not exclude based on this exclude item,
        // but try again in the next exclude item
        shouldExclude = false
        break
      }
    }

    // if all exclude.challenges succeeded, should exclude
    if (shouldExclude) {
      return true
    }
  }
  return false
}

// cache for fetching comment cids, never expire
const commentCache = new QuickLRU({maxSize: 10000})
const invalidIpnsName = 'i'
// cache for fetching comment updates, expire after 1 day
const commentUpdateCache = new TinyCache()
const commentUpdateCacheTime = 1000 * 60 * 60
const getCommentPending = {}

const shouldExcludeChallengeCommentCids = async (subplebbitChallenge, challengeRequestMessage, plebbit) => {
  if (!subplebbitChallenge || typeof subplebbitChallenge !== 'object') {
    throw Error(`shouldExcludeChallengeCommentCids invalid subplebbitChallenge argument '${subplebbitChallenge}'`)
  }
  if (!challengeRequestMessage || typeof challengeRequestMessage !== 'object') {
    throw Error(`shouldExcludeChallengeCommentCids invalid challengeRequestMessage argument '${challengeRequestMessage}'`)
  }
  if (typeof plebbit?.getComment !== 'function') {
    throw Error(`shouldExcludeChallengeCommentCids invalid plebbit argument '${plebbit}'`)
  }
  const commentCids = challengeRequestMessage.challengeCommentCids
  const author = challengeRequestMessage.publication?.author
  if (commentCids && !Array.isArray(commentCids)) {
    throw Error(`shouldExcludeChallengeCommentCids invalid commentCids argument '${commentCids}'`)
  }
  if (!author?.address || typeof author?.address !== 'string') {
    throw Error(`shouldExcludeChallengeCommentCids invalid challengeRequestMessage.publication.author.address argument '${author?.address}'`)
  }

  const _getComment = async (commentCid, addressesSet) => {
    // comment is cached
    let cachedComment = commentCache.get(commentCid)

    // comment is not cached, add to cache
    let comment
    if (!cachedComment) {
      comment = await plebbit.getComment(commentCid)
      // only cache useful values
      const author = {address: comment?.author?.address}
      cachedComment = {ipnsName: comment.ipnsName || invalidIpnsName, subplebbitAddress: comment.subplebbitAddress, author}
      commentCache.set(commentCid, cachedComment)
    }

    // comment has no ipns name
    if (cachedComment?.ipnsName === invalidIpnsName) {
      throw Error('comment has invalid ipns name')
    }

    // subplebbit address doesn't match filter
    if (!addressesSet.has(cachedComment.subplebbitAddress)) {
      throw Error(`comment doesn't have subplebbit address`)
    }

    // author address doesn't match author
    if (cachedComment?.author?.address !== author.address) {
      throw Error(`comment author address doesn't match publication author address`)
    }

    // comment hasn't been updated yet
    let cachedCommentUpdate = commentUpdateCache.get(cachedComment.ipnsName)
    if (!cachedCommentUpdate) {
      let commentUpdate = comment
      if (!commentUpdate) {
        commentUpdate = await plebbit.createComment({cid: commentCid, ipnsName: commentCache.ipnsName})
      }
      const commentUpdatePromise = new Promise((resolve) => commentUpdate.once('update', resolve))
      await commentUpdate.update()
      await commentUpdatePromise
      await commentUpdate.stop()
      // only cache useful values
      cachedCommentUpdate = {}
      if (commentUpdate?.author?.subplebbit) {
        cachedCommentUpdate.author = {subplebbit: commentUpdate?.author?.subplebbit}
      }
      commentUpdateCache.put(cachedComment.ipnsName, cachedCommentUpdate, commentUpdateCacheTime)
      commentUpdateCache._timeouts[cachedComment.ipnsName].unref?.()
    }

    return {...cachedComment, ...cachedCommentUpdate}
  }

  const getComment = async (commentCid, addressesSet) => {
    // don't fetch the same comment twice
    const sleep = (ms) => new Promise(r => setTimeout(r, ms))
    const pendingKey = commentCid + plebbit.plebbitOptions?.ipfsGatewayUrl + plebbit.plebbitOptions?.ipfsHttpClientOptions?.url
    while (getCommentPending[pendingKey] === true) {
      await sleep(20)
    }
    getCommentPending[pendingKey] = true

    try {
      const res = await _getComment(commentCid, addressesSet)
      return res
    }
    catch (e) {
      throw e
    }
    finally {
      getCommentPending[pendingKey] = false
    }
  }

  const validateComment = async (commentCid, addressesSet, exclude) => {
    const comment = await getComment(commentCid, addressesSet, plebbit)
    const {postScore, replyScore, firstCommentTimestamp} = exclude?.subplebbit || {}
    if (
      testScore(postScore, comment.author?.subplebbit?.postScore) &&
      testScore(replyScore, comment.author?.subplebbit?.replyScore) &&
      testFirstCommentTimestamp(firstCommentTimestamp, comment.author?.subplebbit?.firstCommentTimestamp)
    ) {
      // do nothing, test passed
      return
    }
    throw Error(`should not exclude comment cid`)
  }

  const validateExclude = async (exclude) => {
    let {addresses, maxCommentCids} = exclude?.subplebbit || {}
    if (!maxCommentCids) {
      maxCommentCids = 3
    }

    // no friendly sub addresses
    if (!addresses?.length) {
      throw Error('no friendly sub addresses')
    }
    const addressesSet = new Set(addresses)

    // author didn't provide comment cids
    if (!commentCids?.length) {
      throw Error(`author didn't provide comment cids`)
    }

    // fetch and test all comments of the author async
    const validateCommentPromises = []
    let i = 0
    while (i < maxCommentCids) {
      const commentCid = commentCids[i++]
      if (commentCid) {
        validateCommentPromises.push(validateComment(commentCid, addressesSet, exclude))
      }
    }

    // if doesn't throw, at least 1 test comment promise passed
    try {
      await Promise.any(validateCommentPromises)
    }
    catch (e) {
      // console.log(validateCommentPromises) // debug all validate comments
      e.message = `should not exclude: ${e.message}`
      throw Error(e)
    }

    // if exclude test passed, do nothing
  }

  // iterate over all excludes, and test them async
  const validateExcludePromises = []
  for (const exclude of subplebbitChallenge.exclude || []) {
    validateExcludePromises.push(validateExclude(exclude))
  }

  // if at least 1 test passed, should exclude
  try {
    await Promise.any(validateExcludePromises)
    return true
  }
  catch (e) {
    // console.log(validateExcludePromises) // debug all validate excludes
  }

  // if no exlucde test passed. should not exclude
  return false
}

module.exports = {
  shouldExcludeChallengeCommentCids, 
  shouldExcludePublication, 
  shouldExcludeChallengeSuccess, 
  addToRateLimiter, 
  testRateLimit
}
