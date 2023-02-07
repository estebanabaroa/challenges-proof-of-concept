
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

const shouldExcludeFriendlySub = async (challenge, commentCids) => {
  // console.log({challenge, commentCids})
  for (const exclude of challenge.exclude || []) {
    const {addresses, maxCommentCids, postScore, replyScore, firstCommentTimestamp} = exclude?.friendlySub || {}

    console.log({maxCommentCids, addresses, firstCommentTimestamp, postScore, replyScore, commentCids})

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
        (postScore === undefined || comment.update.author.subplebbit.postScore >= postScore) &&
        (replyScore === undefined || comment.update.author.subplebbit.replyScore >= replyScore) &&
        (firstCommentTimestamp === undefined || comment.update.author.subplebbit.firstCommentTimestamp <= firstCommentTimestamp)
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

module.exports = {shouldExcludeFriendlySub}
