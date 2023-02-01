

const getChallenge = async () => {
  throw Error('friendly sub karma does not issue custom challenges')
}

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
        postScore: 100,
        replyScore: 100
      }
    }
  }
}

const getChallengeVerification = async ({friendlySubAddresses = '', maxCidsToCheck = '3'} = {}, challengeAnwser) => {
  maxCidsToCheck = Number(maxCidsToCheck)
  friendlySubAddresses = friendlySubAddresses.split(',')
  if (!friendlySubAddresses.length) {
    throw Error('no friendly sub addresses')
  }
  const friendlySubAddressesSet = new Set(friendlySubAddresses)

  // parse comment cids submitted by author
  let commentCids = []
  try {
    commentCids = JSON.parse(challengeAnwser) // challengeAnwser is a JSON array of comment cids
  }
  catch (e) {}
  // author didn't provide comment cids
  if (!commentCids.length) {
    return {
      success: false,
      error: `Author didn't provide any comment cids.`
    }
  }

  // fetch comments of the author
  const comments = []
  let i = 0
  while (i < maxCidsToCheck) {
    const commentCid = commentCids[i++]
    if (commentCid) {
      comments.push(await getComment(commentCid))
    }
  }

  const commentsInFriendlySubs = []
  for (const comment of comments) {
    if (friendlySubAddressesSet.has(comment.subplebbitAddress)) {
      commentsInFriendlySubs.push(comment)
    }
  }
  // author didn't provide comments in friendly subs
  if (!commentsInFriendlySubs.length) {
    return {
      success: false,
      error: `Author didn't provide any comment cids in friendly subs.`
    }
  }

  // fetch comment updates to have access to 
  for (const i in commentsInFriendlySubs) {
    commentsInFriendlySubs[i].update = await getCommentUpdate(commentsInFriendlySubs[i].ipnsName)
  }

  const commentsWithMinimumKarma = []
  for (const comment of commentsInFriendlySubs) {
    if (comment.update.author.subplebbit.postScore > 50) {
      commentsWithMinimumKarma.push(comment)
    }
  }

  // author doesn't have the minimum karma
  if (!commentsWithMinimumKarma.length) {
    return {
      success: false,
      error: `Author didn't provide any comment cids with minimum karma.`
    }
  }

  return {
    success: true
  }
}

module.exports = {getChallenge, getChallengeVerification}
