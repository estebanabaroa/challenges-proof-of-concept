// require('util').inspect.defaultOptions.maxStringLength = 50
require('util').inspect.defaultOptions.depth = null
const path = require('path')

// define mock Subplebbit instances
const textMathChallegeSubplebbit = {
  title: 'text-math challenge subplebbit',
  settings: {
    challenges: [
      {
        path: path.join(__dirname, 'challenges', 'text-math'),
        options: {difficulty: '3'}
      }
    ]
  }
}
const captchaAndMathChallegeSubplebbit = {
  title: 'captcha and math challenge subplebbit',
  settings: {
    challenges: [
      {
        path: path.join(__dirname, 'challenges', 'captcha-canvas-v3'),
        options: {
          width: '600', 
          height: '400',
          characters: '10',
          color: '#000000'
        }
      },
      {
        path: path.join(__dirname, 'challenges', 'text-math'),
        options: {difficulty: '1'}
      }
    ]
  }
}
const excludeHighKarmaChallegeSubplebbit = {
  title: 'exclude high karma challenge subplebbit',
  settings: {
    challenges: [
      {
        path: path.join(__dirname, 'challenges', 'text-math'),
        options: {difficulty: '3'},
        // exclude if the author match any one item in the array
        exclude: [
          {postScore: 100, replyScore: 100}, // exclude author that has more than 100 post score AND 100 reply score
          {firstCommentTimestamp: Date.now() - 1000*60*60*24*100} // exclude author with account age older than 100 days
        ]
      }
    ]
  }
}
const friendlySubKarmaAndAgeChallegeSubplebbit = {
  title: 'friendly sub karma AND age challenge subplebbit',
  prechallenges: [
    {
      path: path.join(__dirname, 'challenges', 'friendly-sub-karma'),
      options: {
        friendlySubAddresses: 'friendly-sub.eth,friendly-sub2.eth',
        maxCidsToCheck: '3',
        // must match BOTH filters
        firstCommentTimestamp: String(Date.now() - 1000*60*60*24*100),
        postScore: '100',
      }
    }
  ],
  settings: {
    challenges: [
      {
        path: path.join(__dirname, 'challenges', 'auto-fail'),
        exclude: [
          // exclude any author that passed subplebbit.prechallenges[0] OR challenges subplebbit.prechallenges[1] AND subplebbit.prechallenges[2]
          {prechallenges: [0]},
          {prechallenges: [1, 2]},
        ]
      }
    ]
  }
}
const friendlySubKarmaOrAgeChallegeSubplebbit = {
  title: 'friendly sub karma OR age challenge subplebbit',
  prechallenges: [
    {
      path: path.join(__dirname, 'challenges', 'friendly-sub-karma'),
      options: {
        friendlySubAddresses: 'friendly-sub.eth,friendly-sub2.eth',
        maxCidsToCheck: '3',
        postScore: '100',
      }
    },
    {
      path: path.join(__dirname, 'challenges', 'friendly-sub-karma'),
      options: {
        friendlySubAddresses: 'friendly-sub.eth,friendly-sub2.eth',
        maxCidsToCheck: '3',
        firstCommentTimestamp: String(Date.now() - 1000*60*60*24*100),
      }
    }
  ],
  settings: {
    challenges: [
      {
        path: path.join(__dirname, 'challenges', 'auto-fail'),
        exclude: [
          // exclude any author that passed subplebbit.prechallenges[0] OR challenges subplebbit.prechallenges[1] AND subplebbit.prechallenges[2]
          {prechallenges: [0]},
          {prechallenges: [1, 2]},
        ]
      }
    ]
  }
}
const subplebbits = [
  // textMathChallegeSubplebbit, 
  // captchaAndMathChallegeSubplebbit, 
  // excludeHighKarmaChallegeSubplebbit, 
  // friendlySubKarmaAndAgeChallegeSubplebbit, 
  friendlySubKarmaOrAgeChallegeSubplebbit
]

// define mock Author instances
const highKarmaAuthor = {address: 'high-karma.eth'}
const lowKarmaAuthor = {address: 'low-karma.eth'}
const authors = [highKarmaAuthor, lowKarmaAuthor]

// define mock author karma scores and account age
const subplebbitAuthors = {
  [highKarmaAuthor.address]: {
    [excludeHighKarmaChallegeSubplebbit.title]: {postScore: 1000, replyScore: 1000, firstCommentTimestamp: 1}
  }
}

// define mock prechallenge answers
const prechallengeAnswers = {
  [highKarmaAuthor.address]: {
    // list of comment cids to use as karma minimum post score
    [friendlySubKarmaAndAgeChallegeSubplebbit.title]: JSON.stringify(['Qm...', 'Qm...']),
    [friendlySubKarmaOrAgeChallegeSubplebbit.title]: JSON.stringify(['Qm...', 'Qm...'])
  }
}

;(async () => {
  // interate over all authors to get a challenge for it
  for (const author of authors) {
    console.log('')
    console.log('')
    console.log('--', 'author ' + author.address + ':')
    console.log('')

    for (const subplebbit of subplebbits) {
      const challenges = []
      const challengeSuccesses = []
      const challengeFailures = []
      const prechallenges = [] // maybe call this prechallengeVerifications
      const prechallengeSuccesses = []
      const prechallengeFailures = []

      // prechallenges
      for (const subplebbitPrechallenge of subplebbit.prechallenges || []) {
        const challengeAnswer = prechallengeAnswers[author.address]?.[subplebbit.title]
        const {getChallengeVerification} = require(subplebbitPrechallenge.path)
        const challengeVerification = await getChallengeVerification(subplebbitPrechallenge.options, challengeAnswer)
        prechallenges.push(challengeVerification)
        if (challengeVerification.success === false) {
          prechallengeFailures.push(subplebbit.title + ': ' + challengeVerification.error)
        }
        else if (challengeVerification.success === true) {
          prechallengeSuccesses.push(subplebbit.title)
        }
      }

      // interate over all challenges of the subplebbit, can be more than 1
      for (const subplebbitChallenge of subplebbit.settings.challenges) {

        // exclude author from challenge based on the subplebbit minimum karma settings
        const subplebbitAuthor = subplebbitAuthors[author.address]?.[subplebbit.title]
        if (shouldExcludeAuthor(subplebbitChallenge, subplebbitAuthor)) {
          continue
        }
        if (shouldExcludePrechallengeSuccess(subplebbitChallenge, prechallenges)) {
          continue
        }

        // get the getChallenge function
        const {getChallenge} = require(subplebbitChallenge.path)

        // call the getChallenge function using the options of subplebbit.challenges[i]
        const challenge = await getChallenge(subplebbitChallenge.options)
        challenges.push(challenge)
        if (challenge.success === false) {
          challengeFailures.push(subplebbit.title + ': ' + challenge.error)
        }
        else if (challenge.success === true) {
          challengeSuccesses.push(subplebbit.title)
        }
      }

      console.log('----', subplebbit.title + ':')
      console.log('')
      if (prechallenges.length) {
        console.log('prechallenges:', prechallenges)
      }
      if (prechallengeSuccesses.length) {
        console.log('prechallengeSuccesses:', prechallengeSuccesses)
      }
      if (prechallengeFailures.length) {
        console.log('prechallengeFailures:', prechallengeFailures)
      }
      console.log('')
      if (challenges.length) {
        console.log('challenges:', challenges)
      }
      if (challengeSuccesses.length) {
        console.log('challengeSuccesses:', challengeSuccesses)
      }
      if (challengeFailures.length) {
        console.log('challengeFailures:', challengeFailures)
      }
      console.log('')
    }
  }
})()

function shouldExcludeAuthor(subplebbitChallenge, subplebbitAuthor) {
  if (!subplebbitAuthor || !subplebbitChallenge.exclude) {
    return false
  }

  // if match any of the exclude array, should exclude
  for (const exclude of subplebbitChallenge.exclude) {
    // if match all of the exclude item properties, should exclude
    if (
      (!exclude.postScore || exclude.postScore < subplebbitAuthor.postScore) &&
      (!exclude.replyScore || exclude.replyScore < subplebbitAuthor.replyScore) &&
      (!exclude.firstCommentTimestamp || exclude.firstCommentTimestamp > subplebbitAuthor.firstCommentTimestamp)
    ) {
      return true
    }
  }
  return false
}

function shouldExcludePrechallengeSuccess(subplebbitChallenge, prechallenges) {
  console.log({subplebbitChallenge, prechallenges})
  if (!prechallenges || !subplebbitChallenge.exclude) {
    return false
  }

  // if match any of the exclude array, should exclude
  for (const exclude of subplebbitChallenge.exclude) {

    // has no prechallenge exclude rules
    if (!exclude.prechallenges?.length) {
      continue
    }

    // if any of exclude.prechallenges failed, don't exclude
    let shouldExclude = true
    for (const prechallengeIndex of exclude.prechallenges || []) {
      if (prechallenges?.[prechallengeIndex]?.success !== true) {
        shouldExclude = false
      }
    }

    // if all exclude.prechallenges succeeded, should exclude
    if (shouldExclude) {
      return true
    }
  }
  return false
}
