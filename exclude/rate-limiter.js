const TinyCache = require('tinycache')
const QuickLRU = require('quick-lru')
const {RateLimiter} = require('limiter')
const {
  isVote, 
  isReply, 
  isPost, 
  testVote, 
  testReply,
  testPost
} = require('./utils')

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

module.exports = {
  addToRateLimiter, 
  testRateLimit
}
