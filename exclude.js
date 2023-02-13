const TinyCache = require('tinycache')
const QuickLRU = require('quick-lru')

// e.g. secondsToGoBack = 60 would return the timestamp 1 minute ago
const getTimestampSecondsAgo = (secondsToGoBack) => Math.round(Date.now() / 1000) - secondsToGoBack

function shouldExcludeAuthor(subplebbitChallenge, author) {
  if (!subplebbitChallenge || typeof subplebbitChallenge !== 'object') {
    throw Error(`shouldExcludeAuthor invalid subplebbitChallenge argument '${subplebbitChallenge}'`)
  }
  if (author && typeof author !== 'object') {
    throw Error(`shouldExcludeAuthor invalid author argument '${author}'`)
  }

  if (!subplebbitChallenge.exclude) {
    return false
  }

  // if match any of the exclude array, should exclude
  for (const exclude of subplebbitChallenge.exclude) {
    // if doesn't have any author excludes, shouldn't exclude
    if (
      !exclude.postScore &&
      !exclude.replyScore &&
      !exclude.firstCommentTimestamp &&
      !exclude.address?.length
    ) {
      continue
    }

    // if match all of the exclude item properties, should exclude
    let shouldExclude = true
    if (exclude.postScore && exclude.postScore > (author.subplebbit?.postScore || 0)) {
      shouldExclude = false
    }
    if (exclude.replyScore && exclude.replyScore > (author.subplebbit?.replyScore || 0)) {
      shouldExclude = false
    }
    // firstCommentTimestamp value first needs to be put through Date.now() - firstCommentTimestamp
    if (exclude.firstCommentTimestamp && getTimestampSecondsAgo(exclude.firstCommentTimestamp) < (author.subplebbit?.firstCommentTimestamp || Infinity)) {
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

function shouldExcludeChallengeSuccess(subplebbitChallenge, challengeResults) {
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

const shouldExcludeAuthorCommentCids = async (subplebbitChallenge, commentCids, plebbit) => {
  if (!subplebbitChallenge || typeof subplebbitChallenge !== 'object') {
    throw Error(`shouldExcludeAuthorCommentCids invalid subplebbitChallenge argument '${subplebbitChallenge}'`)
  }
  if (commentCids && !Array.isArray(commentCids)) {
    throw Error(`shouldExcludeAuthorCommentCids invalid commentCids argument '${commentCids}'`)
  }
  if (typeof plebbit?.getComment !== 'function') {
    throw Error(`shouldExcludeAuthorCommentCids invalid plebbit argument '${plebbit}'`)
  }

  const _getComment = async (commentCid, addressesSet) => {
    // comment is cached
    let cachedComment = commentCache.get(commentCid)

    // comment is not cached, add to cache
    let comment
    if (!cachedComment) {
      comment = await plebbit.getComment(commentCid)
      // only cache useful values
      cachedComment = {ipnsName: comment.ipnsName || invalidIpnsName, subplebbitAddress: comment.subplebbitAddress}
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
      await sleep(100)
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

  const testComment = async (commentCid, addressesSet, exclude) => {
    const comment = await getComment(commentCid, addressesSet, plebbit)
    const {postScore, replyScore, firstCommentTimestamp} = exclude?.subplebbit || {}
    if (
      (postScore === undefined || (comment.author.subplebbit.postScore || 0) >= postScore) &&
      (replyScore === undefined || (comment.author.subplebbit.replyScore || 0) >= replyScore) &&
      // firstCommentTimestamp value first needs to be put through Date.now() - firstCommentTimestamp
      (firstCommentTimestamp === undefined || (comment.author.subplebbit.firstCommentTimestamp || Infinity) <= getTimestampSecondsAgo(firstCommentTimestamp))
    ) {
      // do nothing, test passed
      return
    }
    throw Error(`should not exclude comment cid`)
  }

  const testExclude = async (exclude) => {
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
    const testCommentPromises = []
    let i = 0
    while (i < maxCommentCids) {
      const commentCid = commentCids[i++]
      if (commentCid) {
        testCommentPromises.push(testComment(commentCid, addressesSet, exclude))
      }
    }

    // if doesn't throw, at least 1 test comment promise passed
    try {
      await Promise.any(testCommentPromises)
    }
    catch (e) {
      // console.log(testCommentPromises)
      e.message = `should not exclude: ${e.message}`
      throw Error(e)
    }

    // if exclude test passed, do nothing
  }

  // iterate over all excludes, and test them async
  const testExcludePromise = []
  for (const exclude of subplebbitChallenge.exclude || []) {
    testExcludePromise.push(testExclude(exclude))
  }

  // if at least 1 test passed, should exclude
  try {
    await Promise.any(testExcludePromise)
    return true
  }
  catch (e) {
    // console.log(testExcludePromise)
  }

  // if no exlucde test passed. should not exclude
  return false
}

module.exports = {shouldExcludeAuthorCommentCids, shouldExcludeAuthor, shouldExcludeChallengeSuccess}
