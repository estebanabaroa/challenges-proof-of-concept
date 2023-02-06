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
      path: path.join(__dirname, 'prechallenges', 'friendly-sub-karma'),
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
      path: path.join(__dirname, 'prechallenges', 'friendly-sub-karma'),
      options: {
        friendlySubAddresses: 'friendly-sub.eth,friendly-sub2.eth',
        maxCidsToCheck: '3',
        postScore: '100',
      }
    },
    {
      path: path.join(__dirname, 'prechallenges', 'friendly-sub-karma'),
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
const whitelistChallegeSubplebbit = {
  title: 'whitelist challenge subplebbit',
  prechallenges: [
    {
      path: path.join(__dirname, 'prechallenges', 'whitelist'),
      options: {
        whitelist: 'high-karma.eth,some-author.eth',
      },
      // if failed, auto reject
      required: true
    },
    {
      path: path.join(__dirname, 'prechallenges', 'friendly-sub-karma'),
      options: {
        friendlySubAddresses: 'friendly-sub.eth,friendly-sub2.eth',
        maxCidsToCheck: '3',
        postScore: '100',
      },
      // if failed AND not excluded, auto reject
      required: true,
      exclude: [{prechallenges: [0]}]
    },
  ],
  settings: {
    // challenges should never be triggered on prechallenge fails because both prechallenges are required
    challenges: [
      {
        path: path.join(__dirname, 'challenges', 'auto-fail'),
        // challenge should never be triggered on prechallenge success because both are excluded
        exclude: [
          {prechallenges: [0]},
          {prechallenges: [1]}
        ]
      }
    ]
  }
}
const blacklistChallegeSubplebbit = {
  title: 'blacklist challenge subplebbit',
  settings: {
    // challenges should never be triggered on prechallenge fails because both prechallenges are required
    challenges: [
      {
        path: path.join(__dirname, 'challenges', 'blacklist'),
        options: {
          blacklist: 'high-karma.eth,some-author.eth',
        }
      },
    ]
  }
}
const erc20BalanceChallegeSubplebbit = {
  title: 'erc20 balance challenge subplebbit',
  prechallenges: [
    {
      path: path.join(__dirname, 'prechallenges', 'erc20-balance'),
      options: {
        chainTicker: 'eth',
        address: '0x...',
        symbol: 'PLEB',
        decimals: '18',
        minBalance: '1000'
      },
      // if failed, auto reject
      required: true
    },
  ],
  settings: {
    challenges: []
  }
}
const erc20PaymentChallegeSubplebbit = {
  title: 'erc20 payment challenge subplebbit',
  prechallenges: [
    {
      path: path.join(__dirname, 'prechallenges', 'erc20-payment'),
      options: {
        chainTicker: 'eth',
        contractAddress: '0x...',
        recipientAddress: '0x...',
        symbol: 'PLEB',
        decimals: '18',
        postPrice: '1000',
        replyPrice: '100',
        votePrice: '10'
      },
      // if failed, auto reject
      required: true
    },
  ],
  settings: {
    challenges: []
  }
}
const evmContractCallChallegeSubplebbit = {
  title: 'evm contract call challenge subplebbit',
  prechallenges: [
    {
      path: path.join(__dirname, 'prechallenges', 'evm-contract-call'),
      options: {
        chainTicker: 'eth',
        // contract address
        address: '0x...',
        // abi of the contract method
        abi: '{"constant":true,"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"}',
        condition: '>1000'
      },
      // if failed, auto reject
      required: true
    },
  ],
  settings: {
    challenges: []
  }
}
const passwordChallegeSubplebbit = {
  title: 'password challenge subplebbit',
  prechallenges: [
    {
      path: path.join(__dirname, 'prechallenges', 'question'),
      options: {
        answer: 'password',
      },
      challenge: {
        challenge: 'What is the password?',
        type: 'text'
      },
      // if failed, auto reject
      required: true
    },
  ],
  settings: {
    challenges: []
  }
}
const subplebbits = [
  // textMathChallegeSubplebbit, 
  // captchaAndMathChallegeSubplebbit, 
  // excludeHighKarmaChallegeSubplebbit, 
  // friendlySubKarmaAndAgeChallegeSubplebbit, 
  // friendlySubKarmaOrAgeChallegeSubplebbit,
  // whitelistChallegeSubplebbit
  // blacklistChallegeSubplebbit
  // erc20BalanceChallegeSubplebbit
  // erc20PaymentChallegeSubplebbit
  // evmContractCallChallegeSubplebbit
  passwordChallegeSubplebbit
]

// define mock Author instances
const highKarmaAuthor = {
  address: 'high-karma.eth',
  wallets: {eth: {address: '0x...', signature: '0x...'}}
}
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
    [friendlySubKarmaOrAgeChallegeSubplebbit.title]: JSON.stringify(['Qm...', 'Qm...']),
    [passwordChallegeSubplebbit.title]: 'password'
  }
}

// display mock requirements
if (process.argv[2] === 'req') {
  for (const subplebbit of subplebbits) {
    console.log('--', subplebbit.title)
    // mock displaying the prechallenges requirements in the interface
    for (const subplebbitPrechallenge of subplebbit.prechallenges || []) {
      console.log(subplebbitPrechallenge)
      console.log(getChallengeRequirements(subplebbitPrechallenge))
    }

    // mock displaying the challenges requirements in the interface
    for (const subplebbitChallenge of subplebbit.settings.challenges) {
      console.log(subplebbitChallenge)
      console.log(getChallengeRequirements(subplebbitChallenge))
    }
  }
  process.exit()
}

;(async () => {
  // interate over all authors to get a challenge for it
  for (const author of authors) {
    console.log('')
    console.log('')
    console.log('--', 'author ' + author.address + ':')
    console.log('')

    // define mock publication
    const publication = {
      content: 'some content',
      timestamp: Date.now(),
      author
    }

    let failedRequiredPrechallenge = false
    for (const subplebbit of subplebbits) {
      let success = true
      const challenges = []
      const challengeSuccesses = []
      const challengeFailures = []
      const prechallenges = [] // maybe call this prechallengeVerifications
      const prechallengeSuccesses = []
      const prechallengeFailures = []

      // mock displaying the prechallenges requirements in the interface
      for (const subplebbitPrechallenge of subplebbit.prechallenges || []) {
        console.log(subplebbitPrechallenge)
        console.log(getChallengeRequirements(subplebbitPrechallenge))
      }

      // prechallenges
      for (const subplebbitPrechallenge of subplebbit.prechallenges || []) {
        // prechallenges can exclude based on the success of previous prechallenges
        if (shouldExcludePrechallengeSuccess(subplebbitPrechallenge, prechallenges)) {
          continue
        }

        const challengeAnswer = prechallengeAnswers[author.address]?.[subplebbit.title]
        const {getChallengeVerification} = require(subplebbitPrechallenge.path)
        const challengeVerification = await getChallengeVerification(subplebbitPrechallenge.options, challengeAnswer, publication)
        prechallenges.push(challengeVerification)
        if (challengeVerification.success === false) {
          prechallengeFailures.push(subplebbit.title + ': ' + challengeVerification.error)

          // if a required challenge has failed, no need to continue
          if (subplebbitPrechallenge.required) {
            failedRequiredPrechallenge = true
            success = false
            break
          }
        }
        else if (challengeVerification.success === true) {
          prechallengeSuccesses.push(subplebbit.title)
        }
      }

      // mock displaying the prechallenges requirements in the interface
      for (const subplebbitChallenge of subplebbit.settings.challenges) {
        console.log(subplebbitChallenge)
        console.log(getChallengeRequirements(subplebbitChallenge))
      }

      // if a required challenge has failed, no need to continue
      if (!failedRequiredPrechallenge) {
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
          const challenge = await getChallenge(subplebbitChallenge.options, publication)
          challenges.push(challenge)
          if (challenge.success === false) {
            challengeFailures.push(subplebbit.title + ': ' + challenge.error)
            success = false
          }
          else if (challenge.success === true) {
            challengeSuccesses.push(subplebbit.title)
          }
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
      if (challenges.length) {
        console.log('challenges:', challenges)
      }
      if (challengeSuccesses.length) {
        console.log('challengeSuccesses:', challengeSuccesses)
      }
      if (challengeFailures.length) {
        console.log('challengeFailures:', challengeFailures)
      }
      console.log('success:', success)
      console.log('')
    }
  }
})()

function getChallengeRequirements(subplebbitChallenge) {
  if (subplebbitChallenge.path) {
    const challengeFile = require(subplebbitChallenge.path)
    subplebbitChallenge = {...subplebbitChallenge, challengeFile}
  }

  const requirements = []
  if (subplebbitChallenge.options?.chainTicker) {
    requirements.push('need autor wallet for chain ticker: ' + subplebbitChallenge.options?.chainTicker)
  }
  if (subplebbitChallenge.exclude) {
    for (const exclude of subplebbitChallenge.exclude) {
      if (exclude.postScore || exclude.replyScore || exclude.firstCommentTimestamp) {
        requirements.push('karma history could bypass some challenges')
        break
      }
    }
  }
  if (subplebbitChallenge.challengeFile?.type) {
    requirements.push('need an interface that supports type: ' + subplebbitChallenge.challengeFile?.type)
  }
  if (subplebbitChallenge.challengeFile?.challengeAnswer) {
    const challengeAnswerQuery = subplebbitChallenge.options[subplebbitChallenge.challengeFile.challengeAnswerPropName]
    requirements.push('publishing will automatically include prechallenge answer: ' + subplebbitChallenge.challengeFile?.challengeAnswer + ' with ' + challengeAnswerQuery)
  }
  if (subplebbitChallenge.challenge?.type) {
    let text = 'need an interface that supports type: ' + subplebbitChallenge.challenge?.type
    if (subplebbitChallenge.challenge.type === 'text' && subplebbitChallenge.challenge.challenge) {
      text += ', the text challenge is: ' + subplebbitChallenge.challenge.challenge 
    }
    else if (subplebbitChallenge.challenge.challenge) {
      text += ', the challenge is included in the subplebbit'
    }
    requirements.push(text)
  }
  return requirements
}

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
