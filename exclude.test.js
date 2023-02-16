// require('util').inspect.defaultOptions.depth = null

const {shouldExcludeChallengeCommentCids, shouldExcludePublication, shouldExcludeChallengeSuccess, testRateLimit, addToRateLimiter} = require('./exclude')
const {expect} = require('chai')
const {Plebbit, subplebbits, authors, subplebbitAuthors, challengeAnswers, challengeCommentCids, results} = require('./fixtures')

// sometimes use random addresses because the rate limiter 
// is based on author addresses and doesn't reset between tests
const getRandomAddress = () => String(Math.random())

describe("shouldExcludePublication", () => {
  it("firstCommentTimestamp", () => {
    const subplebbitChallenge = {
      exclude: [
        {firstCommentTimestamp: 60*60*24*100} // 100 days
      ]
    }
    const oldAuthor = {author: {
      subplebbit: {
        firstCommentTimestamp: Math.round(Date.now() / 1000) - 60*60*24*101 // 101 days
      }
    }}
    const newAuthor = {author: {
      subplebbit: {
        firstCommentTimestamp: Math.round(Date.now() / 1000) - 60*60*24*99 // 99 days
      }
    }}
    expect(shouldExcludePublication(subplebbitChallenge, oldAuthor)).to.equal(true)
    expect(shouldExcludePublication(subplebbitChallenge, newAuthor)).to.equal(false)
  })

  it("firstCommentTimestamp and postScore", () => {
    const subplebbitChallenge = {
      exclude: [
        {
          postScore: 100,
          firstCommentTimestamp: 60*60*24*100 // 100 days
        }
      ]
    }
    const oldAuthor = {author: {
      subplebbit: {
        postScore: 100,
        firstCommentTimestamp: Math.round(Date.now() / 1000) - 60*60*24*101 // 101 days
      }
    }}
    const newAuthor = {author: {
      subplebbit: {
        postScore: 99,
        firstCommentTimestamp: Math.round(Date.now() / 1000) - 60*60*24*101 // 101 days
      }
    }}
    expect(shouldExcludePublication(subplebbitChallenge, oldAuthor)).to.equal(true)
    expect(shouldExcludePublication(subplebbitChallenge, newAuthor)).to.equal(false)
  })

  it("firstCommentTimestamp or (postScore and replyScore)", () => {
    const subplebbitChallenge = {
      exclude: [
        {postScore: 100, replyScore: 100},
        {firstCommentTimestamp: 60*60*24*100} // 100 days
      ]
    }
    const oldAuthor = {author: {
      subplebbit: {
        firstCommentTimestamp: Math.round(Date.now() / 1000) - 60*60*24*101 // 101 days
      }
    }}
    const newAuthor = {author: {
      subplebbit: {
        postScore: 101,
        firstCommentTimestamp: Math.round(Date.now() / 1000) - 60*60*24*99 // 99 days
      }
    }}
    const popularAuthor = {author: {
      subplebbit: {
        postScore: 100, replyScore: 100
      }  
    }}
    expect(shouldExcludePublication(subplebbitChallenge, oldAuthor)).to.equal(true)
    expect(shouldExcludePublication(subplebbitChallenge, newAuthor)).to.equal(false)
    expect(shouldExcludePublication(subplebbitChallenge, popularAuthor)).to.equal(true)
  })

  const author = {address: 'Qm...'}
  const post = {
    content: 'content',
    author
  }
  const reply = {
    content: 'content',
    parentCid: 'Qm...',
    author
  }
  const vote = {
    commentCid: 'Qm...',
    vote: 0,
    author
  }

  it("post", () => {
    const subplebbitChallenge = {
      exclude: [{post: true}]
    }
    expect(shouldExcludePublication(subplebbitChallenge, post)).to.equal(true)
    expect(shouldExcludePublication(subplebbitChallenge, reply)).to.equal(false)
    expect(shouldExcludePublication(subplebbitChallenge, vote)).to.equal(false)
  })

  it("reply", () => {
    const subplebbitChallenge = {
      exclude: [{reply: true}]
    }
    expect(shouldExcludePublication(subplebbitChallenge, post)).to.equal(false)
    expect(shouldExcludePublication(subplebbitChallenge, reply)).to.equal(true)
    expect(shouldExcludePublication(subplebbitChallenge, vote)).to.equal(false)
  })

  it("vote", () => {
    const subplebbitChallenge = {
      exclude: [{vote: true}]
    }
    expect(shouldExcludePublication(subplebbitChallenge, post)).to.equal(false)
    expect(shouldExcludePublication(subplebbitChallenge, reply)).to.equal(false)
    expect(shouldExcludePublication(subplebbitChallenge, vote)).to.equal(true)
  })

  it("vote and reply", () => {
    const subplebbitChallenge = {
      exclude: [{vote: true, reply: true}]
    }
    expect(shouldExcludePublication(subplebbitChallenge, post)).to.equal(false)
    expect(shouldExcludePublication(subplebbitChallenge, reply)).to.equal(false)
    expect(shouldExcludePublication(subplebbitChallenge, vote)).to.equal(false)
  })

  it("rateLimit", () => {
    const subplebbitChallenge = {
      exclude: [
        {rateLimit: 1} // 1 publication per hour
      ]
    }
    const publicationAuthor1 = {author: {address: getRandomAddress()}}
    const publicationAuthor2 = {author: {address: getRandomAddress()}}
    const challengeSuccess = true
    expect(shouldExcludePublication(subplebbitChallenge, publicationAuthor1)).to.equal(true)
    addToRateLimiter(subplebbitChallenge.exclude, publicationAuthor1, challengeSuccess)
    expect(shouldExcludePublication(subplebbitChallenge, publicationAuthor1)).to.equal(false)
    expect(shouldExcludePublication(subplebbitChallenge, publicationAuthor2)).to.equal(true)
  })

  it("rateLimit challengeSuccess false", () => {
    const subplebbitChallenge = {
      exclude: [
        {rateLimit: 1} // 1 publication per hour
      ]
    }
    const publicationAuthor1 = {author: {address: getRandomAddress()}}
    const publicationAuthor2 = {author: {address: getRandomAddress()}}
    const challengeSuccess = false
    expect(shouldExcludePublication(subplebbitChallenge, publicationAuthor1)).to.equal(true)
    addToRateLimiter(subplebbitChallenge.exclude, publicationAuthor1, challengeSuccess)
    // without rateLimitChallengeSuccess, rateLimit only applies to challengeSuccess true publications
    expect(shouldExcludePublication(subplebbitChallenge, publicationAuthor1)).to.equal(true)
    expect(shouldExcludePublication(subplebbitChallenge, publicationAuthor2)).to.equal(true)
  })

  it("rateLimit post, reply, vote", () => {
    const subplebbitChallenge = {
      exclude: [
        {post: true, rateLimit: 1}, // 1 per hour
        {reply: true, rateLimit: 1}, // 1 per hour
        {vote: true, rateLimit: 1}, // 1 per hour
      ]
    }
    const author = {address: getRandomAddress()}
    const publicationPost = {author}
    const publicationReply = {author, parentCid: 'Qm...'}
    const publicationVote = {author, commentCid: 'Qm...', vote: 0}
    let challengeSuccess = true
    expect(shouldExcludePublication(subplebbitChallenge, publicationPost)).to.equal(true)
    expect(shouldExcludePublication(subplebbitChallenge, publicationReply)).to.equal(true)
    expect(shouldExcludePublication(subplebbitChallenge, publicationVote)).to.equal(true)
    addToRateLimiter(subplebbitChallenge.exclude, publicationPost, challengeSuccess)
    expect(shouldExcludePublication(subplebbitChallenge, publicationPost)).to.equal(false)
    expect(shouldExcludePublication(subplebbitChallenge, publicationReply)).to.equal(true)
    expect(shouldExcludePublication(subplebbitChallenge, publicationVote)).to.equal(true)
    addToRateLimiter(subplebbitChallenge.exclude, publicationReply, challengeSuccess)
    expect(shouldExcludePublication(subplebbitChallenge, publicationPost)).to.equal(false)
    expect(shouldExcludePublication(subplebbitChallenge, publicationReply)).to.equal(false)
    expect(shouldExcludePublication(subplebbitChallenge, publicationVote)).to.equal(true)

    // publish with challengeSuccess false, should do nothing
    challengeSuccess = false
    addToRateLimiter(subplebbitChallenge.exclude, publicationVote, challengeSuccess)
    expect(shouldExcludePublication(subplebbitChallenge, publicationPost)).to.equal(false)
    expect(shouldExcludePublication(subplebbitChallenge, publicationReply)).to.equal(false)
    expect(shouldExcludePublication(subplebbitChallenge, publicationVote)).to.equal(true)

    // publish with challengeSuccess true, should rate limit
    challengeSuccess = true
    addToRateLimiter(subplebbitChallenge.exclude, publicationVote, challengeSuccess)
    expect(shouldExcludePublication(subplebbitChallenge, publicationPost)).to.equal(false)
    expect(shouldExcludePublication(subplebbitChallenge, publicationReply)).to.equal(false)
    expect(shouldExcludePublication(subplebbitChallenge, publicationVote)).to.equal(false)
  })

  it("rateLimit rateLimitChallengeSuccess true", () => {
    const subplebbitChallenge = {
      exclude: [
        {rateLimit: 1, rateLimitChallengeSuccess: true} // 1 publication per hour
      ]
    }
    const publicationAuthor1 = {author: {address: getRandomAddress()}}
    const publicationAuthor2 = {author: {address: getRandomAddress()}}
    const challengeSuccess = true
    expect(shouldExcludePublication(subplebbitChallenge, publicationAuthor1)).to.equal(true)
    addToRateLimiter(subplebbitChallenge.exclude, publicationAuthor1, challengeSuccess)
    expect(shouldExcludePublication(subplebbitChallenge, publicationAuthor1)).to.equal(false)
    expect(shouldExcludePublication(subplebbitChallenge, publicationAuthor2)).to.equal(true)
  })

  it("rateLimit rateLimitChallengeSuccess true challengeSuccess false", () => {
    const subplebbitChallenge = {
      exclude: [
        {rateLimit: 1, rateLimitChallengeSuccess: true} // 1 publication per hour
      ]
    }
    const publicationAuthor1 = {author: {address: getRandomAddress()}}
    const publicationAuthor2 = {author: {address: getRandomAddress()}}
    const challengeSuccess = false
    expect(shouldExcludePublication(subplebbitChallenge, publicationAuthor1)).to.equal(true)
    addToRateLimiter(subplebbitChallenge.exclude, publicationAuthor1, challengeSuccess)
    expect(shouldExcludePublication(subplebbitChallenge, publicationAuthor1)).to.equal(true)
    expect(shouldExcludePublication(subplebbitChallenge, publicationAuthor2)).to.equal(true)
  })

  it("rateLimit rateLimitChallengeSuccess false challengeSuccess true", () => {
    const subplebbitChallenge = {
      exclude: [
        {rateLimit: 1, rateLimitChallengeSuccess: false} // 1 publication per hour
      ]
    }
    const publicationAuthor1 = {author: {address: getRandomAddress()}}
    const publicationAuthor2 = {author: {address: getRandomAddress()}}
    const challengeSuccess = true
    expect(shouldExcludePublication(subplebbitChallenge, publicationAuthor1)).to.equal(true)
    addToRateLimiter(subplebbitChallenge.exclude, publicationAuthor1, challengeSuccess)
    expect(shouldExcludePublication(subplebbitChallenge, publicationAuthor1)).to.equal(true)
    expect(shouldExcludePublication(subplebbitChallenge, publicationAuthor2)).to.equal(true)
  })

  it("rateLimit rateLimitChallengeSuccess false challengeSuccess false", () => {
    const subplebbitChallenge = {
      exclude: [
        {rateLimit: 1, rateLimitChallengeSuccess: false} // 1 publication per hour
      ]
    }
    const publicationAuthor1 = {author: {address: getRandomAddress()}}
    const publicationAuthor2 = {author: {address: getRandomAddress()}}
    const challengeSuccess = false
    expect(shouldExcludePublication(subplebbitChallenge, publicationAuthor1)).to.equal(true)
    addToRateLimiter(subplebbitChallenge.exclude, publicationAuthor1, challengeSuccess)
    expect(shouldExcludePublication(subplebbitChallenge, publicationAuthor1)).to.equal(false)
    expect(shouldExcludePublication(subplebbitChallenge, publicationAuthor2)).to.equal(true)
  })

  it("rateLimit post, reply rateLimitChallengeSuccess false", () => {
    const subplebbitChallenge = {
      exclude: [
        {post: true, rateLimit: 1, rateLimitChallengeSuccess: false}, // 1 per hour
        {reply: true, rateLimit: 1}, // 1 per hour
      ]
    }
    const author = {address: getRandomAddress()}
    const publicationPost = {author}
    const publicationReply = {author, parentCid: 'Qm...'}
    const publicationVote = {author, commentCid: 'Qm...', vote: 0}
    let challengeSuccess = true

    expect(shouldExcludePublication(subplebbitChallenge, publicationPost)).to.equal(true)
    expect(shouldExcludePublication(subplebbitChallenge, publicationReply)).to.equal(true)
    // vote can never pass because it's not included in any of the excludes
    expect(shouldExcludePublication(subplebbitChallenge, publicationVote)).to.equal(false)

    // no effect because post true and rateLimitChallengeSuccess false
    addToRateLimiter(subplebbitChallenge.exclude, publicationPost, challengeSuccess)
    expect(shouldExcludePublication(subplebbitChallenge, publicationPost)).to.equal(true)
    expect(shouldExcludePublication(subplebbitChallenge, publicationReply)).to.equal(true)
    expect(shouldExcludePublication(subplebbitChallenge, publicationVote)).to.equal(false)

    // now has effect because success false
    challengeSuccess = false
    addToRateLimiter(subplebbitChallenge.exclude, publicationPost, challengeSuccess)
    expect(shouldExcludePublication(subplebbitChallenge, publicationPost)).to.equal(false)
    expect(shouldExcludePublication(subplebbitChallenge, publicationReply)).to.equal(true)
    expect(shouldExcludePublication(subplebbitChallenge, publicationVote)).to.equal(false)

    // no effect because reply true, challengeSuccess false and rateLimitChallengeSuccess undefined
    addToRateLimiter(subplebbitChallenge.exclude, publicationReply, challengeSuccess)
    expect(shouldExcludePublication(subplebbitChallenge, publicationPost)).to.equal(false)
    expect(shouldExcludePublication(subplebbitChallenge, publicationReply)).to.equal(true)
    expect(shouldExcludePublication(subplebbitChallenge, publicationVote)).to.equal(false)

    // now has effect because success true
    challengeSuccess = true
    addToRateLimiter(subplebbitChallenge.exclude, publicationReply, challengeSuccess)
    expect(shouldExcludePublication(subplebbitChallenge, publicationPost)).to.equal(false)
    expect(shouldExcludePublication(subplebbitChallenge, publicationReply)).to.equal(false)
    expect(shouldExcludePublication(subplebbitChallenge, publicationVote)).to.equal(false)
  })
})

describe("shouldExcludeChallengeSuccess", () => {
  it("exclude 0, 1", () => {
    const subplebbitChallenge = {
      exclude: [
        {challenges: [0, 1]}
      ]
    }
    const challengeResultsSucceed2 = [
      {success: true},
      {success: true},
      {success: false}
    ]
    const challengeResultsSucceed3 = [
      {success: true},
      {success: true},
      {success: true}
    ]
    const challengeResultsFail1 = [
      {success: true},
      {success: false}
    ]
    const challengeResultsFail2 = [
      {success: false},
      {success: false}
    ]
    const challengeResultsEmpty = []
    const challengeResultsMixed = [
      {success: true},
      {success: false},
      {success: true},
      {success: false},
    ]
    expect(shouldExcludeChallengeSuccess(subplebbitChallenge, challengeResultsSucceed2)).to.equal(true)
    expect(shouldExcludeChallengeSuccess(subplebbitChallenge, challengeResultsSucceed3)).to.equal(true)
    expect(shouldExcludeChallengeSuccess(subplebbitChallenge, challengeResultsFail1)).to.equal(false)
    expect(shouldExcludeChallengeSuccess(subplebbitChallenge, challengeResultsFail2)).to.equal(false)
    expect(shouldExcludeChallengeSuccess(subplebbitChallenge, challengeResultsEmpty)).to.equal(false)
    expect(shouldExcludeChallengeSuccess(subplebbitChallenge, challengeResultsMixed)).to.equal(false)
  })

 it("exclude (0, 1) or 2", () => {
    const subplebbitChallenge = {
      exclude: [
        {challenges: [0, 1]},
        {challenges: [2]}
      ]
    }
    const challengeResultsSucceed12 = [
      {success: true},
      {success: true},
      {success: false}
    ]
    const challengeResultsSucceed123 = [
      {success: true},
      {success: true},
      {success: true}
    ]
    const challengeResultsSucceed3 = [
      {success: false},
      {success: false},
      {success: true}
    ]
    const challengeResultsSucceed4 = [
      {success: false},
      {success: false},
      {success: false},
      {success: true}
    ]
    const challengeResultsEmpty = []
    expect(shouldExcludeChallengeSuccess(subplebbitChallenge, challengeResultsSucceed12)).to.equal(true)
    expect(shouldExcludeChallengeSuccess(subplebbitChallenge, challengeResultsSucceed123)).to.equal(true)
    expect(shouldExcludeChallengeSuccess(subplebbitChallenge, challengeResultsSucceed3)).to.equal(true)
    expect(shouldExcludeChallengeSuccess(subplebbitChallenge, challengeResultsSucceed4)).to.equal(false)
    expect(shouldExcludeChallengeSuccess(subplebbitChallenge, challengeResultsEmpty)).to.equal(false)
  })
})

describe("shouldExcludeChallengeCommentCids", () => {
  const getChallengeRequestMessage = (commentCids) => {
    // define author based on high or low karma
    const author = {address: 'Qm...'}
    const [subplebbitAddress,karma,age] = (commentCids?.[0] || '').replace('Qm...', '').split(',')
    if (karma === 'high') {
      author.address = authors[0].address
    }
    else if (karma === 'low') {
      author.address = authors[1].address
    }
    return {
      publication: {author},
      challengeCommentCids: commentCids
    }
  }

  let plebbit
  before(async () => {
    plebbit = await Plebbit()
  })

  it("firstCommentTimestamp", async () => {
    const subplebbitChallenge = {
      exclude: [
        {
          subplebbit: {
            addresses: ['friendly-sub.eth'],
            firstCommentTimestamp: 60*60*24*100, // 100 days
            maxCommentCids: 2
          }
        }
      ]
    }

    const commentCidsOld = getChallengeRequestMessage(['Qm...friendly-sub.eth,high,old', 'Qm...friendly-sub.eth,high,old'])
    const commentCidsNew = getChallengeRequestMessage(['Qm...friendly-sub.eth,high,new', 'Qm...friendly-sub.eth,high,new'])
    const commentCidsNoAuthorSubplebbit = getChallengeRequestMessage(['Qm...friendly-sub.eth', 'Qm...friendly-sub.eth'])
    const commentCidsEmpty = getChallengeRequestMessage([])
    const commentCidsUndefined = getChallengeRequestMessage(undefined)
    const commentCidsWrongSubplebbitAddress = getChallengeRequestMessage(['Qm...wrong.eth,high,old', 'Qm...wrong.eth,high,old'])
    const commentCidsMoreThanMax = getChallengeRequestMessage(['Qm...friendly-sub.eth,high,new', 'Qm...friendly-sub.eth,high,new', 'Qm...friendly-sub.eth,high,old'])

    expect(await shouldExcludeChallengeCommentCids(subplebbitChallenge, commentCidsOld, plebbit)).to.equal(true)
    expect(await shouldExcludeChallengeCommentCids(subplebbitChallenge, commentCidsNew, plebbit)).to.equal(false)
    expect(await shouldExcludeChallengeCommentCids(subplebbitChallenge, commentCidsNoAuthorSubplebbit, plebbit)).to.equal(false)
    expect(await shouldExcludeChallengeCommentCids(subplebbitChallenge, commentCidsEmpty, plebbit)).to.equal(false)
    expect(await shouldExcludeChallengeCommentCids(subplebbitChallenge, commentCidsUndefined, plebbit)).to.equal(false)
    expect(await shouldExcludeChallengeCommentCids(subplebbitChallenge, commentCidsWrongSubplebbitAddress, plebbit)).to.equal(false)
    expect(await shouldExcludeChallengeCommentCids(subplebbitChallenge, commentCidsMoreThanMax, plebbit)).to.equal(false)
  })

  it("firstCommentTimestamp and postScore", async () => {
    const subplebbitChallenge = {
      exclude: [
        {
          subplebbit: {
            addresses: ['friendly-sub.eth'],
            postScore: 100,
            firstCommentTimestamp: 60*60*24*100, // 100 days
            maxCommentCids: 2
          }
        }
      ]
    }
    const commentCidsHighKarma = getChallengeRequestMessage(['Qm...friendly-sub.eth,high', 'Qm...friendly-sub.eth,high'])
    const commentCidsHighKarmaOld = getChallengeRequestMessage(['Qm...friendly-sub.eth,high,old', 'Qm...friendly-sub.eth,high'])
    const commentCidsHighKarmaNew = getChallengeRequestMessage(['Qm...friendly-sub.eth,high,new', 'Qm...friendly-sub.eth,high'])
    const commentCidsLowKarmaOld = getChallengeRequestMessage(['Qm...friendly-sub.eth,low,old', 'Qm...friendly-sub.eth,low,old'])
    const commentCidsNoAuthorSubplebbit = getChallengeRequestMessage(['Qm...friendly-sub.eth', 'Qm...friendly-sub.eth'])
    const commentCidsEmpty = getChallengeRequestMessage([])
    const commentCidsWrongSubplebbitAddress = getChallengeRequestMessage(['Qm...wrong.eth,high', 'Qm...wrong.eth,high'])
    const commentCidsMoreThanMax = getChallengeRequestMessage(['Qm...friendly-sub.eth,low', 'Qm...friendly-sub.eth,low', 'Qm...friendly-sub.eth,high'])

    expect(await shouldExcludeChallengeCommentCids(subplebbitChallenge, commentCidsHighKarma, plebbit)).to.equal(false)
    expect(await shouldExcludeChallengeCommentCids(subplebbitChallenge, commentCidsHighKarmaOld, plebbit)).to.equal(true)
    expect(await shouldExcludeChallengeCommentCids(subplebbitChallenge, commentCidsHighKarmaNew, plebbit)).to.equal(false)
    expect(await shouldExcludeChallengeCommentCids(subplebbitChallenge, commentCidsLowKarmaOld, plebbit)).to.equal(false)
    expect(await shouldExcludeChallengeCommentCids(subplebbitChallenge, commentCidsNoAuthorSubplebbit, plebbit)).to.equal(false)
    expect(await shouldExcludeChallengeCommentCids(subplebbitChallenge, commentCidsEmpty, plebbit)).to.equal(false)
    expect(await shouldExcludeChallengeCommentCids(subplebbitChallenge, commentCidsWrongSubplebbitAddress, plebbit)).to.equal(false)
    expect(await shouldExcludeChallengeCommentCids(subplebbitChallenge, commentCidsMoreThanMax, plebbit)).to.equal(false)
  })

  it("firstCommentTimestamp or (postScore and replyScore)", async () => {
    const subplebbitChallenge = {
      exclude: [
        {
          subplebbit: {
            addresses: ['friendly-sub.eth'],
            firstCommentTimestamp: 60*60*24*100, // 100 days
            maxCommentCids: 2
          }
        },
        {
          subplebbit: {
            addresses: ['friendly-sub.eth'],
            replyScore: 100, postScore: 100,
            maxCommentCids: 2
          }
        }
      ]
    }
    const commentCidsHighKarma = getChallengeRequestMessage(['Qm...friendly-sub.eth,high', 'Qm...friendly-sub.eth,high'])
    const commentCidsHighKarmaOld = getChallengeRequestMessage(['Qm...friendly-sub.eth,high,old', 'Qm...friendly-sub.eth,high'])
    const commentCidsHighKarmaNew = getChallengeRequestMessage(['Qm...friendly-sub.eth,high,new', 'Qm...friendly-sub.eth,high'])
    const commentCidsLowKarmaOld = getChallengeRequestMessage(['Qm...friendly-sub.eth,low,old', 'Qm...friendly-sub.eth,low,old'])
    const commentCidsLowKarmaNew = getChallengeRequestMessage(['Qm...friendly-sub.eth,low,new', 'Qm...friendly-sub.eth,low,new'])
    const commentCidsNoAuthorSubplebbit = getChallengeRequestMessage(['Qm...friendly-sub.eth', 'Qm...friendly-sub.eth'])
    const commentCidsEmpty = getChallengeRequestMessage([])
    const commentCidsWrongSubplebbitAddress = getChallengeRequestMessage(['Qm...wrong.eth,high', 'Qm...wrong.eth,high'])
    const commentCidsMoreThanMax = getChallengeRequestMessage(['Qm...friendly-sub.eth,low', 'Qm...friendly-sub.eth,low', 'Qm...friendly-sub.eth,high'])

    expect(await shouldExcludeChallengeCommentCids(subplebbitChallenge, commentCidsHighKarma, plebbit)).to.equal(true)
    expect(await shouldExcludeChallengeCommentCids(subplebbitChallenge, commentCidsHighKarmaOld, plebbit)).to.equal(true)
    expect(await shouldExcludeChallengeCommentCids(subplebbitChallenge, commentCidsHighKarmaNew, plebbit)).to.equal(true)
    expect(await shouldExcludeChallengeCommentCids(subplebbitChallenge, commentCidsLowKarmaOld, plebbit)).to.equal(true)
    expect(await shouldExcludeChallengeCommentCids(subplebbitChallenge, commentCidsLowKarmaNew, plebbit)).to.equal(false)
    expect(await shouldExcludeChallengeCommentCids(subplebbitChallenge, commentCidsNoAuthorSubplebbit, plebbit)).to.equal(false)
    expect(await shouldExcludeChallengeCommentCids(subplebbitChallenge, commentCidsEmpty, plebbit)).to.equal(false)
    expect(await shouldExcludeChallengeCommentCids(subplebbitChallenge, commentCidsWrongSubplebbitAddress, plebbit)).to.equal(false)
    expect(await shouldExcludeChallengeCommentCids(subplebbitChallenge, commentCidsMoreThanMax, plebbit)).to.equal(false)
  })
})

describe("testRateLimit", () => {
  it("1 any publication type", async () => {
    const author1 = {address: getRandomAddress()}
    const author2 = {address: getRandomAddress()}
    const exclude = {rateLimit: 1}
    const publication1 = {author: author1}
    const publication2 = {author: author2}
    const challengeSuccess = true
    expect(testRateLimit(exclude, publication1)).to.equal(true)
    addToRateLimiter([exclude], publication1, challengeSuccess)
    expect(testRateLimit(exclude, publication1)).to.equal(false)
    expect(testRateLimit(exclude, publication2)).to.equal(true)
  })

  it("1 any publication type challengeSuccess false", async () => {
    const author1 = {address: getRandomAddress()}
    const author2 = {address: getRandomAddress()}
    const exclude = {rateLimit: 1}
    const publication1 = {author: author1}
    const publication2 = {author: author2}
    const challengeSuccess = false
    expect(testRateLimit(exclude, publication1)).to.equal(true)
    addToRateLimiter([exclude], publication1, challengeSuccess)
    // without rateLimitChallengeSuccess set, only successful publications are rate limited
    expect(testRateLimit(exclude, publication1)).to.equal(true)
    expect(testRateLimit(exclude, publication2)).to.equal(true)
  })

  it("10 any publication type", async () => {
    const exclude = {rateLimit: 10}
    const publication = {author: {address: getRandomAddress()}}
    const challengeSuccess = true
    expect(testRateLimit(exclude, publication)).to.equal(true)
    let count = 20
    while(count--) {
      addToRateLimiter([exclude], publication, challengeSuccess)  
    }
    expect(testRateLimit(exclude, publication)).to.equal(false)
  })

  it("1 post type true", async () => {
    const author = {address: getRandomAddress()}
    const exclude = {rateLimit: 1, post: true}
    const publicationPost = {author}
    const publicationReply = {author, parentCid: 'Qm...'}
    const publicationVote = {author, commentCid: 'Qm...', vote: 0}
    const challengeSuccess = true
    expect(testRateLimit(exclude, publicationPost)).to.equal(true)
    expect(testRateLimit(exclude, publicationReply)).to.equal(true)
    expect(testRateLimit(exclude, publicationVote)).to.equal(true)
    addToRateLimiter([exclude], publicationPost, challengeSuccess)
    expect(testRateLimit(exclude, publicationPost)).to.equal(false)
    expect(testRateLimit(exclude, publicationReply)).to.equal(true)
    expect(testRateLimit(exclude, publicationVote)).to.equal(true)
    addToRateLimiter([exclude], publicationReply, challengeSuccess)
    expect(testRateLimit(exclude, publicationPost)).to.equal(false)
    expect(testRateLimit(exclude, publicationReply)).to.equal(true)
    expect(testRateLimit(exclude, publicationVote)).to.equal(true)
    addToRateLimiter([exclude], publicationVote, challengeSuccess)
    expect(testRateLimit(exclude, publicationPost)).to.equal(false)
    expect(testRateLimit(exclude, publicationReply)).to.equal(true)
    expect(testRateLimit(exclude, publicationVote)).to.equal(true)
  })

  it("1 post type true challengeSuccess false", async () => {
    const author = {address: getRandomAddress()}
    const exclude = {rateLimit: 1, post: true}
    const publicationPost = {author}
    const publicationReply = {author, parentCid: 'Qm...'}
    const publicationVote = {author, commentCid: 'Qm...', vote: 0}
    const challengeSuccess = false
    expect(testRateLimit(exclude, publicationPost)).to.equal(true)
    expect(testRateLimit(exclude, publicationReply)).to.equal(true)
    expect(testRateLimit(exclude, publicationVote)).to.equal(true)
    addToRateLimiter([exclude], publicationPost, challengeSuccess)
    // without rateLimitChallengeSuccess set, only successful publications are rate limited
    expect(testRateLimit(exclude, publicationPost)).to.equal(true)
    expect(testRateLimit(exclude, publicationReply)).to.equal(true)
    expect(testRateLimit(exclude, publicationVote)).to.equal(true)
  })

  it("1 post type false", async () => {
    const author = {address: getRandomAddress()}
    const exclude = {rateLimit: 1, post: false}
    const publicationPost = {author}
    const publicationReply = {author, parentCid: 'Qm...'}
    const publicationVote = {author, commentCid: 'Qm...', vote: 0}
    const challengeSuccess = true
    expect(testRateLimit(exclude, publicationPost)).to.equal(true)
    expect(testRateLimit(exclude, publicationReply)).to.equal(true)
    expect(testRateLimit(exclude, publicationVote)).to.equal(true)
    addToRateLimiter([exclude], publicationPost, challengeSuccess)
    expect(testRateLimit(exclude, publicationPost)).to.equal(true)
    expect(testRateLimit(exclude, publicationReply)).to.equal(false)
    expect(testRateLimit(exclude, publicationVote)).to.equal(false)
    addToRateLimiter([exclude], publicationReply, challengeSuccess)
    addToRateLimiter([exclude], publicationVote, challengeSuccess)
    expect(testRateLimit(exclude, publicationPost)).to.equal(true)
    expect(testRateLimit(exclude, publicationReply)).to.equal(false)
    expect(testRateLimit(exclude, publicationVote)).to.equal(false)
  })

  it("1 post and reply type false", async () => {
    const author = {address: getRandomAddress()}
    const exclude = {rateLimit: 1, post: false, reply: false}
    const publicationPost = {author}
    const publicationReply = {author, parentCid: 'Qm...'}
    const publicationVote = {author, commentCid: 'Qm...', vote: 0}
    const challengeSuccess = true
    expect(testRateLimit(exclude, publicationPost)).to.equal(true)
    expect(testRateLimit(exclude, publicationReply)).to.equal(true)
    expect(testRateLimit(exclude, publicationVote)).to.equal(true)
    addToRateLimiter([exclude], publicationPost, challengeSuccess)
    addToRateLimiter([exclude], publicationReply, challengeSuccess)
    addToRateLimiter([exclude], publicationVote, challengeSuccess)
    expect(testRateLimit(exclude, publicationPost)).to.equal(true)
    expect(testRateLimit(exclude, publicationReply)).to.equal(true)
    expect(testRateLimit(exclude, publicationVote)).to.equal(false)
  })

  it("1 any publication type rateLimitChallengeSuccess true", async () => {
    const author1 = {address: getRandomAddress()}
    const author2 = {address: getRandomAddress()}
    const exclude = {rateLimit: 1, rateLimitChallengeSuccess: true}
    const publication1 = {author: author1}
    const publication2 = {author: author2}
    const challengeSuccess = true
    expect(testRateLimit(exclude, publication1)).to.equal(true)
    addToRateLimiter([exclude], publication1, challengeSuccess)
    expect(testRateLimit(exclude, publication1)).to.equal(false)
    expect(testRateLimit(exclude, publication2)).to.equal(true)
  })

  it("1 any publication type rateLimitChallengeSuccess true challengeSuccess false", async () => {
    const author1 = {address: getRandomAddress()}
    const author2 = {address: getRandomAddress()}
    const exclude = {rateLimit: 1, rateLimitChallengeSuccess: true}
    const publication1 = {author: author1}
    const publication2 = {author: author2}
    const challengeSuccess = false
    expect(testRateLimit(exclude, publication1)).to.equal(true)
    addToRateLimiter([exclude], publication1, challengeSuccess)
    // true because if rateLimitChallengeSuccess true, dont count challengeSuccess false
    expect(testRateLimit(exclude, publication1)).to.equal(true)
    expect(testRateLimit(exclude, publication2)).to.equal(true)
  })

  it("1 any publication type rateLimitChallengeSuccess false challengeSuccess true", async () => {
    const author1 = {address: getRandomAddress()}
    const author2 = {address: getRandomAddress()}
    const exclude = {rateLimit: 1, rateLimitChallengeSuccess: false}
    const publication1 = {author: author1}
    const publication2 = {author: author2}
    const challengeSuccess = true
    expect(testRateLimit(exclude, publication1)).to.equal(true)
    addToRateLimiter([exclude], publication1, challengeSuccess)
    // true because if rateLimitChallengeSuccess false, dont count challengeSuccess true
    expect(testRateLimit(exclude, publication1)).to.equal(true)
    expect(testRateLimit(exclude, publication2)).to.equal(true)
  })

  it("1 any publication type rateLimitChallengeSuccess false challengeSuccess false", async () => {
    const author1 = {address: getRandomAddress()}
    const author2 = {address: getRandomAddress()}
    const exclude = {rateLimit: 1, rateLimitChallengeSuccess: false}
    const publication1 = {author: author1}
    const publication2 = {author: author2}
    const challengeSuccess = false
    expect(testRateLimit(exclude, publication1)).to.equal(true)
    addToRateLimiter([exclude], publication1, challengeSuccess)
    // false because if rateLimitChallengeSuccess false, count challengeSuccess false
    expect(testRateLimit(exclude, publication1)).to.equal(false)
    expect(testRateLimit(exclude, publication2)).to.equal(true)
  })

  it("1 post type true rateLimitChallengeSuccess true", async () => {
    const author = {address: getRandomAddress()}
    const exclude = {rateLimit: 1, post: true, rateLimitChallengeSuccess: true}
    const publicationPost = {author}
    const publicationReply = {author, parentCid: 'Qm...'}
    const publicationVote = {author, commentCid: 'Qm...', vote: 0}
    const challengeSuccess = true
    expect(testRateLimit(exclude, publicationPost)).to.equal(true)
    expect(testRateLimit(exclude, publicationReply)).to.equal(true)
    expect(testRateLimit(exclude, publicationVote)).to.equal(true)
    addToRateLimiter([exclude], publicationPost, challengeSuccess)
    expect(testRateLimit(exclude, publicationPost)).to.equal(false)
    expect(testRateLimit(exclude, publicationReply)).to.equal(true)
    expect(testRateLimit(exclude, publicationVote)).to.equal(true)
    addToRateLimiter([exclude], publicationReply, challengeSuccess)
    expect(testRateLimit(exclude, publicationPost)).to.equal(false)
    expect(testRateLimit(exclude, publicationReply)).to.equal(true)
    expect(testRateLimit(exclude, publicationVote)).to.equal(true)
    addToRateLimiter([exclude], publicationVote, challengeSuccess)
    expect(testRateLimit(exclude, publicationPost)).to.equal(false)
    expect(testRateLimit(exclude, publicationReply)).to.equal(true)
    expect(testRateLimit(exclude, publicationVote)).to.equal(true)
  })

  it("1 post type true rateLimitChallengeSuccess true challengeSuccess false", async () => {
    const author = {address: getRandomAddress()}
    const exclude = {rateLimit: 1, post: true, rateLimitChallengeSuccess: true}
    const publicationPost = {author}
    const publicationReply = {author, parentCid: 'Qm...'}
    const publicationVote = {author, commentCid: 'Qm...', vote: 0}
    const challengeSuccess = false
    expect(testRateLimit(exclude, publicationPost)).to.equal(true)
    expect(testRateLimit(exclude, publicationReply)).to.equal(true)
    expect(testRateLimit(exclude, publicationVote)).to.equal(true)
    addToRateLimiter([exclude], publicationPost, challengeSuccess)
    expect(testRateLimit(exclude, publicationPost)).to.equal(true)
    expect(testRateLimit(exclude, publicationReply)).to.equal(true)
    expect(testRateLimit(exclude, publicationVote)).to.equal(true)
    addToRateLimiter([exclude], publicationReply, challengeSuccess)
    expect(testRateLimit(exclude, publicationPost)).to.equal(true)
    expect(testRateLimit(exclude, publicationReply)).to.equal(true)
    expect(testRateLimit(exclude, publicationVote)).to.equal(true)
    addToRateLimiter([exclude], publicationVote, challengeSuccess)
    expect(testRateLimit(exclude, publicationPost)).to.equal(true)
    expect(testRateLimit(exclude, publicationReply)).to.equal(true)
    expect(testRateLimit(exclude, publicationVote)).to.equal(true)
  })

  it("1 post type true rateLimitChallengeSuccess false challengeSuccess true", async () => {
    const author = {address: getRandomAddress()}
    const exclude = {rateLimit: 1, post: true, rateLimitChallengeSuccess: false}
    const publicationPost = {author}
    const publicationReply = {author, parentCid: 'Qm...'}
    const publicationVote = {author, commentCid: 'Qm...', vote: 0}
    const challengeSuccess = true
    expect(testRateLimit(exclude, publicationPost)).to.equal(true)
    expect(testRateLimit(exclude, publicationReply)).to.equal(true)
    expect(testRateLimit(exclude, publicationVote)).to.equal(true)
    addToRateLimiter([exclude], publicationPost, challengeSuccess)
    expect(testRateLimit(exclude, publicationPost)).to.equal(true)
    expect(testRateLimit(exclude, publicationReply)).to.equal(true)
    expect(testRateLimit(exclude, publicationVote)).to.equal(true)
    addToRateLimiter([exclude], publicationReply, challengeSuccess)
    expect(testRateLimit(exclude, publicationPost)).to.equal(true)
    expect(testRateLimit(exclude, publicationReply)).to.equal(true)
    expect(testRateLimit(exclude, publicationVote)).to.equal(true)
    addToRateLimiter([exclude], publicationVote, challengeSuccess)
    expect(testRateLimit(exclude, publicationPost)).to.equal(true)
    expect(testRateLimit(exclude, publicationReply)).to.equal(true)
    expect(testRateLimit(exclude, publicationVote)).to.equal(true)
  })

  it("1 post type true rateLimitChallengeSuccess false challengeSuccess false", async () => {
    const author = {address: getRandomAddress()}
    const exclude = {rateLimit: 1, post: true, rateLimitChallengeSuccess: false}
    const publicationPost = {author}
    const publicationReply = {author, parentCid: 'Qm...'}
    const publicationVote = {author, commentCid: 'Qm...', vote: 0}
    const challengeSuccess = false
    expect(testRateLimit(exclude, publicationPost)).to.equal(true)
    expect(testRateLimit(exclude, publicationReply)).to.equal(true)
    expect(testRateLimit(exclude, publicationVote)).to.equal(true)
    addToRateLimiter([exclude], publicationPost, challengeSuccess)
    expect(testRateLimit(exclude, publicationPost)).to.equal(false)
    expect(testRateLimit(exclude, publicationReply)).to.equal(true)
    expect(testRateLimit(exclude, publicationVote)).to.equal(true)
    addToRateLimiter([exclude], publicationReply, challengeSuccess)
    expect(testRateLimit(exclude, publicationPost)).to.equal(false)
    expect(testRateLimit(exclude, publicationReply)).to.equal(true)
    expect(testRateLimit(exclude, publicationVote)).to.equal(true)
    addToRateLimiter([exclude], publicationVote, challengeSuccess)
    expect(testRateLimit(exclude, publicationPost)).to.equal(false)
    expect(testRateLimit(exclude, publicationReply)).to.equal(true)
    expect(testRateLimit(exclude, publicationVote)).to.equal(true)
  })

  const expectExcludeArray = (excludeArray, publication, value) => {
    for (const exclude of excludeArray) {
      expect(testRateLimit(exclude, publication)).to.equal(value)
    }
  }

  it("multiple exclude", async () => {
    const author = {address: getRandomAddress()}
    const excludePost = {rateLimit: 1, post: true}
    const excludeReply = {rateLimit: 1, reply: true}
    const excludeVote = {rateLimit: 1, vote: true}
    const excludeArray = [excludePost, excludeReply, excludeVote]

    const publicationPost = {author}
    const publicationReply = {author, parentCid: 'Qm...'}
    const publicationVote = {author, commentCid: 'Qm...', vote: 0}
    const challengeSuccess = true

    expect(testRateLimit(excludePost, publicationPost)).to.equal(true)
    expect(testRateLimit(excludeReply, publicationPost)).to.equal(true)
    expect(testRateLimit(excludeVote, publicationPost)).to.equal(true)
    expect(testRateLimit(excludePost, publicationReply)).to.equal(true)
    expect(testRateLimit(excludeReply, publicationReply)).to.equal(true)
    expect(testRateLimit(excludeVote, publicationReply)).to.equal(true)

    // publish one post
    addToRateLimiter(excludeArray, publicationPost, challengeSuccess)

    // test post publication against all exclude, only post exclude fails
    expect(testRateLimit(excludePost, publicationPost)).to.equal(false)
    expect(testRateLimit(excludeReply, publicationPost)).to.equal(true)
    expect(testRateLimit(excludeVote, publicationPost)).to.equal(true)

    // test reply publication against all exclude, none fail because no reply published yet
    expect(testRateLimit(excludePost, publicationReply)).to.equal(true)
    expect(testRateLimit(excludeReply, publicationReply)).to.equal(true)
    expect(testRateLimit(excludeVote, publicationReply)).to.equal(true)

    // publish one reply
    addToRateLimiter(excludeArray, publicationReply, challengeSuccess)

    // test post publication against all exclude, only post exclude fails
    expect(testRateLimit(excludePost, publicationPost)).to.equal(false)
    expect(testRateLimit(excludeReply, publicationPost)).to.equal(true)
    expect(testRateLimit(excludeVote, publicationPost)).to.equal(true)

    // test reply publication against all exclude, only reply exclude fails
    expect(testRateLimit(excludePost, publicationReply)).to.equal(true)
    expect(testRateLimit(excludeReply, publicationReply)).to.equal(false)
    expect(testRateLimit(excludeVote, publicationReply)).to.equal(true)
  })

  it("same exclude rateLimit multiple times", async () => {
    const author = {address: getRandomAddress()}
    const exclude1 = {rateLimit: 1}
    const exclude1Copy = {rateLimit: 1}
    const exclude2 = {rateLimit: 2}
    const excludePost1 = {rateLimit: 1, post: true}
    const excludePost2 = {rateLimit: 2, post: true}
    const excludeArray = [exclude1, exclude1Copy, exclude2, excludePost1, excludePost2]
    const publicationPost = {author}
    const challengeSuccess = true

    expect(testRateLimit(exclude1, publicationPost)).to.equal(true)
    expect(testRateLimit(exclude2, publicationPost)).to.equal(true)
    expect(testRateLimit(excludePost1, publicationPost)).to.equal(true)
    expect(testRateLimit(excludePost2, publicationPost)).to.equal(true)

    // publish 1 post
    addToRateLimiter(excludeArray, publicationPost, challengeSuccess)

    expect(testRateLimit(exclude1, publicationPost)).to.equal(false)
    expect(testRateLimit(exclude2, publicationPost)).to.equal(true)
    expect(testRateLimit(excludePost1, publicationPost)).to.equal(false)
    expect(testRateLimit(excludePost2, publicationPost)).to.equal(true)

    // // publish 2 post
    addToRateLimiter(excludeArray, publicationPost, challengeSuccess)

    expect(testRateLimit(exclude1, publicationPost)).to.equal(false)
    expect(testRateLimit(exclude2, publicationPost)).to.equal(false)
    expect(testRateLimit(excludePost1, publicationPost)).to.equal(false)
    expect(testRateLimit(excludePost2, publicationPost)).to.equal(false)
  })
})
