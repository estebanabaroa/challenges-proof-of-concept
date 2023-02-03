
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
        replyScore: 100,
        firstCommentTimestamp: Date.now() - 1000*60*60*24*999
      }
    }
  }
}

const getChallengeVerification = async ({friendlySubAddresses = '', maxCidsToCheck = '3', firstCommentTimestamp = '', postScore = '', replyScore = ''} = {}, challengeAnswer) => {
  // parse options strings
  maxCidsToCheck = Number(maxCidsToCheck)
  friendlySubAddresses = friendlySubAddresses.split(',')
  firstCommentTimestamp = firstCommentTimestamp !== '' && Number(firstCommentTimestamp)
  postScore = postScore !== '' && Number(postScore)
  replyScore = replyScore !== '' && Number(replyScore)
  // console.log({maxCidsToCheck, friendlySubAddresses, firstCommentTimestamp, postScore, replyScore, challengeAnswer})

  if (!friendlySubAddresses.length) {
    throw Error('no friendly sub addresses')
  }
  const friendlySubAddressesSet = new Set(friendlySubAddresses)

  // parse comment cids submitted by author
  let commentCids = []
  try {
    commentCids = JSON.parse(challengeAnswer) // challengeAnswer is a JSON array of comment cids
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

  // filter comments with minimum karma based on the challenge karma options
  const commentsWithMinimumKarmaAndAge = []
  for (const comment of commentsInFriendlySubs) {
    // an author must match ALL defined filters
    if (
      (postScore === false || comment.update.author.subplebbit.postScore >= postScore) &&
      (replyScore === false || comment.update.author.subplebbit.replyScore >= replyScore) &&
      (firstCommentTimestamp === false || comment.update.author.subplebbit.firstCommentTimestamp <= firstCommentTimestamp)
    ) {
      commentsWithMinimumKarmaAndAge.push(comment)
    }
  }

  // author doesn't have the minimum karma
  if (!commentsWithMinimumKarmaAndAge.length) {
    return {
      success: false,
      error: `Author didn't provide any comment cids with minimum karma and age.`
    }
  }

  return {
    success: true
  }
}

module.exports = {getChallenge, getChallengeVerification}
