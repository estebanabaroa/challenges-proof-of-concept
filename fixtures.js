const path = require('path')
const {EventEmitter} = require('events')

// mock comment instance
class Comment extends EventEmitter {
  constructor(cid) {
    super()
    const [subplebbitAddress,karma] = cid.replace('Qm...', '').split(',')
    this.subplebbitAddress = subplebbitAddress
    this.ipnsName = 'ipns name ' + cid

    // use this value to mock giving 'high' or 'low' karma to the author
    this.karma = karma
  }
  async update() {
    setTimeout(() => {
      if (this.karma === 'high') {
        this.author = {
          subplebbit: {
            postScore: 1000,
            replyScore: 1000,
            firstCommentTimestamp: Math.round(Date.now() / 1000) - 60*60*24*999 // 999 days ago
          }
        }
      }
      else if (this.karma === 'low') {
        this.author = {
          subplebbit: {
            postScore: 1,
            replyScore: 1,
            firstCommentTimestamp: Math.round(Date.now() / 1000) - 60*60*24*1 // 1 day ago
          }
        }
      }
      this.emit('update', this)
    }, 100).unref()
  }
  async stop() {
    this.removeAllListeners()
  }
}

// mock plebbit sync
const createPlebbit = () => {
  return {
    getComment: async (cid) => new Comment(cid),
    createComment: async (cid) => new Comment(cid)
  }
}
// mock Plebbit async
const Plebbit = async () => createPlebbit()

// mock the challenges included in plebbit-js
Plebbit.challenges = {
  'text-math': require(path.join(__dirname, 'plebbit-js-challenges', 'text-math')),
  'captcha-canvas-v3': require(path.join(__dirname, 'plebbit-js-challenges', 'captcha-canvas-v3'))
}

// define mock Subplebbit instances
const textMathChallegeSubplebbit = {
  title: 'text-math challenge subplebbit',
  settings: {
    challenges: [
      {
        name: 'text-math',
        options: {difficulty: '3'},
        description: 'Complete a math challenge.'
      }
    ]
  }
}
const captchaAndMathChallegeSubplebbit = {
  title: 'captcha and math challenge subplebbit',
  settings: {
    challenges: [
      {
        name: 'captcha-canvas-v3',
        options: {
          width: '600', 
          height: '400',
          characters: '10',
          color: '#000000'
        },
        description: 'Complete a captcha challenge.'
      },
      {
        name: 'text-math',
        options: {difficulty: '2'},
        description: 'Complete a math challenge.'
      }
    ]
  }
}
const excludeHighKarmaChallegeSubplebbit = {
  title: 'exclude high karma challenge subplebbit',
  settings: {
    challenges: [
      {
        name: 'text-math',
        options: {difficulty: '3'},
        // exclude if the author match any one item in the array
        exclude: [
          {postScore: 100, replyScore: 100}, // exclude author that has more than 100 post score AND 100 reply score
          // exclude author with account age older than 100 days (Math.round(Date.now() / 1000)- 60*60*24*100)
          {firstCommentTimestamp: 60*60*24*100}
        ]
      }
    ]
  }
}
const excludeAccountAgeChallegeSubplebbit = {
  title: 'exclude account age challenge subplebbit',
  settings: {
    challenges: [
      {
        path: path.join(__dirname, 'challenges', 'fail'),
        // exclude if the author match any one item in the array
        exclude: [
          // exclude author with account age older than 100 days (Math.round(Date.now() / 1000)- 60*60*24*100)
          {firstCommentTimestamp: 60*60*24*100}
        ]
      }
    ]
  }
}
const whitelistChallegeSubplebbit = {
  title: 'whitelist challenge subplebbit',
  settings: {
    challenges: [
      {
        // the fail challenge always fails
        path: path.join(__dirname, 'challenges', 'fail'),
        options: {
          error: `You're not whitelisted.`
        },
        // challenge should never be triggered if the author address is excluded
        exclude: [
          {address: ['high-karma.eth']},
        ]
      }
    ]
  }
}
const blacklistChallegeSubplebbit = {
  title: 'blacklist challenge subplebbit',
  settings: {
    challenges: [
      {
        path: path.join(__dirname, 'challenges', 'blacklist'),
        options: {
          blacklist: 'low-karma.eth,some-author.eth',
        }
      },
    ]
  }
}
const erc20PaymentChallegeSubplebbit = {
  title: 'erc20 payment challenge subplebbit',
  settings: {
    challenges: [
      {
        path: path.join(__dirname, 'challenges', 'erc20-payment'),
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
      },
    ]
  }
}
const evmContractCallChallegeSubplebbit = {
  title: 'evm contract call challenge subplebbit',
  settings: {
    challenges: [
      {
        path: path.join(__dirname, 'challenges', 'evm-contract-call'),
        options: {
          chainTicker: 'eth',
          // contract address
          address: '0x...',
          // abi of the contract method
          abi: '{"constant":true,"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"}',
          condition: '>1000',
          // error to display to the user if condition fails
          error: 'PLEB token balance must be greater than 1000.'
        },
      },
    ],
  }
}
const passwordChallegeSubplebbit = {
  title: 'password challenge subplebbit',
  settings: {
    challenges: [
      {
        path: path.join(__dirname, 'challenges', 'question'),
        options: {
          question: 'What is the password?',
          answer: 'password',
        },
      },
    ],
  }
}
const excludeFriendlySubKarmaChallegeSubplebbit = {
  title: 'exclude friendly sub karma challenge subplebbit',
  settings: {
    challenges: [
      {
        path: path.join(__dirname, 'challenges', 'fail'),
        exclude: [
          // exclude author with karma in those subs using publication.challengeCommentCids
          {subplebbit: {
            addresses: ['friendly-sub.eth', 'friendly-sub2.eth'],
            postScore: 100,
            postReply: 100,
            maxCommentCids: 3
          }}
        ]
      }
    ]
  }
}
const twoOutOf4SuccessChallegeSubplebbit = {
  title: '2 out of 4 success challenge subplebbit',
  settings: {
    // challenge 0, 1 fail, but excluded if 2, 3 succeed, which makes challengeVerification.challengeSuccess = true
    challenges: [
      {
        path: path.join(__dirname, 'challenges', 'fail'),
        exclude: [{challenges: [2, 3]}]
      },
      {
        path: path.join(__dirname, 'challenges', 'fail'),
        exclude: [{challenges: [2, 3]}]
      },
      {
        path: path.join(__dirname, 'challenges', 'blacklist'),
        options: {blacklist: 'low-karma.eth,some-author.eth'}
      },
      {
        path: path.join(__dirname, 'challenges', 'blacklist'),
        options: {blacklist: 'low-karma.eth,some-author.eth'}
      },
    ]
  }
}
const twoOutOf4SuccessInverseChallegeSubplebbit = {
  title: '2 out of 4 success inverse challenge subplebbit',
  settings: {
    // challenge 0, 1 fail, but excluded if 2, 3 succeed, which makes challengeVerification.challengeSuccess = true
    challenges: [
      {
        path: path.join(__dirname, 'challenges', 'blacklist'),
        options: {blacklist: 'low-karma.eth,some-author.eth'}
      },
      {
        path: path.join(__dirname, 'challenges', 'blacklist'),
        options: {blacklist: 'low-karma.eth,some-author.eth'}
      },
      {
        path: path.join(__dirname, 'challenges', 'fail'),
        exclude: [{challenges: [0, 1]}]
      },
      {
        path: path.join(__dirname, 'challenges', 'fail'),
        exclude: [{challenges: [0, 1]}]
      },
    ]
  }
}
// define mock Author instances
const highKarmaAuthor = {
  address: 'high-karma.eth',
  wallets: {eth: {address: '0x...', signature: '0x...'}}
}
const lowKarmaAuthor = {address: 'low-karma.eth'}
const authors = [
  highKarmaAuthor, 
  lowKarmaAuthor
]

// define mock author karma scores and account age
const subplebbitAuthors = {
  [highKarmaAuthor.address]: {
    [excludeHighKarmaChallegeSubplebbit.title]: {postScore: 1000, replyScore: 1000, firstCommentTimestamp: 1},
    [excludeAccountAgeChallegeSubplebbit.title]: {postScore: 1, replyScore: 1, firstCommentTimestamp: 1}
  },
  [lowKarmaAuthor.address]: {
    [excludeHighKarmaChallegeSubplebbit.title]: {postScore: 1, replyScore: 1000},
    [excludeAccountAgeChallegeSubplebbit.title]: {postScore: 1000, replyScore: 1000}
  }
}

// define mock friendly sub comment cids
const challengeCommentCids = {
  [highKarmaAuthor.address]: ['Qm...friendly-sub.eth,high', 'Qm...friendly-sub.eth,high']
}

const challengeAnswers = {
  [highKarmaAuthor.address]: {
    [passwordChallegeSubplebbit.title]: ['password']
  }
}

const subplebbits = [
  textMathChallegeSubplebbit, 
  captchaAndMathChallegeSubplebbit, 
  excludeHighKarmaChallegeSubplebbit,
  excludeAccountAgeChallegeSubplebbit,
  whitelistChallegeSubplebbit,
  blacklistChallegeSubplebbit,
  erc20PaymentChallegeSubplebbit,
  evmContractCallChallegeSubplebbit,
  passwordChallegeSubplebbit,
  excludeFriendlySubKarmaChallegeSubplebbit,
  twoOutOf4SuccessChallegeSubplebbit,
  twoOutOf4SuccessInverseChallegeSubplebbit
]

const results = {
  'text-math challenge subplebbit': {
    'high-karma.eth': {
      pendingChallenges: [ { challenge: '660 - 256', answer: '404', type: 'text' } ]
    },
    'low-karma.eth': {
      pendingChallenges: [ { challenge: '69 * 63', answer: '4347', type: 'text' } ]
    }
  },
  'captcha and math challenge subplebbit': {
    'high-karma.eth': {
      pendingChallenges: [
        { challenge: '10 - 2', answer: '8', type: 'text' },
        { challenge: '94 + 25', answer: '119', type: 'text' }
      ]
    },
    'low-karma.eth': {
      pendingChallenges: [
        { challenge: '7 - 7', answer: '0', type: 'text' },
        { challenge: '99 - 90', answer: '9', type: 'text' }
      ]
    }
  },
  'exclude high karma challenge subplebbit': {
    'high-karma.eth': { challengeSuccess: true },
    'low-karma.eth': {
      pendingChallenges: [ { challenge: '82 * 45', answer: '3690', type: 'text' } ]
    }
  },
  'exclude account age challenge subplebbit': {
    'high-karma.eth': { challengeSuccess: true },
    'low-karma.eth': {
      challengeSuccess: false,
      challengeErrors: [ "You're not allowed to publish." ]
    }
  },
  'whitelist challenge subplebbit': {
    'high-karma.eth': { challengeSuccess: true },
    'low-karma.eth': {
      challengeSuccess: false,
      challengeErrors: [ "You're not whitelisted." ]
    }
  },
  'blacklist challenge subplebbit': {
    'high-karma.eth': { challengeSuccess: true },
    'low-karma.eth': {
      challengeSuccess: false,
      challengeErrors: [ "You're blacklisted." ]
    }
  },
  'erc20 payment challenge subplebbit': {
    'high-karma.eth': { challengeSuccess: true },
    'low-karma.eth': {
      challengeSuccess: false,
      challengeErrors: [ "Author doesn't have wallet (eth) set." ]
    }
  },
  'evm contract call challenge subplebbit': {
    'high-karma.eth': { challengeSuccess: true },
    'low-karma.eth': {
      challengeSuccess: false,
      challengeErrors: [ "Author doesn't have a wallet set." ]
    }
  },
  'password challenge subplebbit': {
    'high-karma.eth': { challengeSuccess: true },
    'low-karma.eth': { challengeSuccess: false, challengeErrors: [ 'Wrong answer.' ] }
  },
  'exclude friendly sub karma challenge subplebbit': {
    'high-karma.eth': { challengeSuccess: true },
    'low-karma.eth': {
      challengeSuccess: false,
      challengeErrors: [ "You're not allowed to publish." ]
    }
  },
  '2 out of 4 success challenge subplebbit': {
    'high-karma.eth': { challengeSuccess: true },
    'low-karma.eth': {
      challengeSuccess: false,
      challengeErrors: [
        "You're not allowed to publish.",
        "You're not allowed to publish.",
        "You're blacklisted.",
        "You're blacklisted."
      ]
    }
  },
  '2 out of 4 success inverse challenge subplebbit': {
    'high-karma.eth': { challengeSuccess: true },
    'low-karma.eth': {
      challengeSuccess: false,
      challengeErrors: [
        "You're blacklisted.",
        "You're blacklisted.",
        "You're not allowed to publish.",
        "You're not allowed to publish."
      ]
    }
  }
}

// add mock plebbit to add the mock subplebbit instances
for (const subplebbit of subplebbits) {
  subplebbit.plebbit = createPlebbit()
}

module.exports = {Plebbit, subplebbits, authors, subplebbitAuthors, challengeCommentCids, challengeAnswers, results}
