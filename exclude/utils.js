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

module.exports = {
  isVote, 
  isReply, 
  isPost, 
  testVote, 
  testReply,
  testPost,
  testScore,
  testFirstCommentTimestamp
}
