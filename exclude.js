
const getComment = async (cid) => {
  return {
    subplebbitAddress: 'friendly-sub.eth',
    ipnsName: 'Qm...'
  }
}

const getCommentUpdate = async (ipnsName) => {
  return {
    author: {
      subplebbit: {
        postScore: 1000,
        replyScore: 1000,
        firstCommentTimestamp: Date.now() - 1000*60*60*24*999
      }
    }
  }
}

const shouldExcludeAuthorCommentCids = async (challenge, commentCids) => {
  // console.log({challenge, commentCids})
  for (const exclude of challenge.exclude || []) {
    const {addresses, maxCommentCids, postScore, replyScore, firstCommentTimestamp} = exclude?.subplebbit || {}

    // console.log({maxCommentCids, addresses, firstCommentTimestamp, postScore, replyScore, commentCids})

    // no friendly sub addresses
    if (!addresses?.length) {
      continue
    }
    const addressesSet = new Set(addresses)

    // author didn't provide comment cids
    if (!commentCids?.length) {
      continue
    }

    // fetch comments of the author
    const comments = []
    let i = 0
    while (i < maxCommentCids) {
      const commentCid = commentCids[i++]
      if (commentCid) {
        comments.push(await getComment(commentCid))
      }
    }

    const commentsInFriendlySubs = []
    for (const comment of comments) {
      if (addressesSet.has(comment.subplebbitAddress)) {
        commentsInFriendlySubs.push(comment)
      }
    }
    // author didn't provide comments in friendly subs
    if (!commentsInFriendlySubs.length) {
      continue
    }

    // fetch comment updates to have access to 
    for (const i in commentsInFriendlySubs) {
      commentsInFriendlySubs[i].update = await getCommentUpdate(commentsInFriendlySubs[i].ipnsName)
    }

    // filter comments with minimum karma based on the challenge karma options
    const commentsWithMinimumKarmaAndAge = []
    for (const comment of commentsInFriendlySubs) {
      // an author must match ALL defined filters
      if (
        (postScore === undefined || (comment.update.author.subplebbit.postScore || 0) >= postScore) &&
        (replyScore === undefined || (comment.update.author.subplebbit.replyScore || 0) >= replyScore) &&
        (firstCommentTimestamp === undefined || (comment.update.author.subplebbit.firstCommentTimestamp || 0) <= firstCommentTimestamp)
      ) {
        commentsWithMinimumKarmaAndAge.push(comment)
      }
    }

    // author doesn't have the minimum karma
    if (!commentsWithMinimumKarmaAndAge.length) {
      continue
    }

    // author has the minimum karma for the exclude item
    return true
  }
  return false
}

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
    if (exclude.postScore && exclude.postScore > (author.subplebbitAuthor?.postScore || 0)) {
      shouldExclude = false
    }
    if (exclude.replyScore && exclude.replyScore > (author.subplebbitAuthor?.replyScore || 0)) {
      shouldExclude = false
    }
    if (exclude.firstCommentTimestamp && exclude.firstCommentTimestamp < (author.subplebbitAuthor?.firstCommentTimestamp || 0)) {
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

module.exports = {shouldExcludeAuthorCommentCids, shouldExcludeAuthor, shouldExcludeChallengeSuccess}
