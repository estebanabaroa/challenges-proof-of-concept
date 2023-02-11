const TinyCache = require('tinycache')

// e.g. secondsToGoBack = 60 would return the timestamp 1 minute ago
const getTimestampSecondsAgo = (secondsToGoBack) => Math.round(Date.now() / 1000) - secondsToGoBack

function shouldExcludeAuthor(subplebbitChallenge, author) {
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

const cache = new TinyCache()
const cacheTime = 1000 * 60 * 60
const addToCache = (key, value) => {
  cache.put(key, JSON.parse(JSON.stringify(value)))
}

const shouldExcludeAuthorCommentCids = async (challenge, commentCids, plebbit) => {
  const getComment = async (commentCid, addressesSet) => {
    let comment = cache.get(commentCid)
    if (!comment) {
      comment = await plebbit.getComment(commentCid)
      addToCache(commentCid, comment)
    }
    if (!addressesSet.has(comment.subplebbitAddress)) {
      throw Error(`comment doesn't have subplebbit address`)
    }

    // comment hasn't been updated yet
    if (!comment.updatedAt) {
      const commentUpdatePromise = new Promise((resolve) => {
        comment.once('update', resolve)
      })
      await comment.update()
      await commentUpdatePromise
      comment.stop()
    }

    return comment
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
    }
    throw Error(`should not exclude comment cid`)
  }

  const testExclude = async (exclude) => {
    const {addresses, maxCommentCids} = exclude?.subplebbit || {}

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
      e.message = `should not exclude: ${e.message}`
      throw Error(e)
    }

    // if exclude test passed, do nothing
  }

  // iterate over all excludes, and test them async
  const testExcludePromise = []
  for (const exclude of challenge.exclude || []) {
    const {addresses, maxCommentCids} = exclude?.subplebbit || {}
    testExcludePromise.push(exclude)
  }

  // if at least 1 test passed, should exclude
  try {
    await Promise.any(testExcludePromise)
    return true
  }
  catch (e) {}

  // if no exlucde test passed. should not exclude
  return false
}

module.exports = {shouldExcludeAuthorCommentCids, shouldExcludeAuthor, shouldExcludeChallengeSuccess}
