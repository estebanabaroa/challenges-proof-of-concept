// require('util').inspect.defaultOptions.depth = null

const {shouldExcludeChallengeCommentCids, shouldExcludePublication, shouldExcludeChallengeSuccess} = require('./exclude')
const {expect} = require('chai')
const {Plebbit, subplebbits, authors, subplebbitAuthors, challengeAnswers, challengeCommentCids, results} = require('./fixtures')

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
    const commentCidsOld = ['Qm...friendly-sub.eth,high,old', 'Qm...friendly-sub.eth,high,old']
    const commentCidsNew = ['Qm...friendly-sub.eth,high,new', 'Qm...friendly-sub.eth,high,new']
    const commentCidsNoAuthorSubplebbit = ['Qm...friendly-sub.eth', 'Qm...friendly-sub.eth']
    const commentCidsEmpty = []
    const commentCidsWrongSubplebbitAddress = ['Qm...wrong.eth,high,old', 'Qm...wrong.eth,high,old']
    const commentCidsMoreThanMax = ['Qm...friendly-sub.eth,high,new', 'Qm...friendly-sub.eth,high,new', 'Qm...friendly-sub.eth,high,old']

    expect(await shouldExcludeChallengeCommentCids(subplebbitChallenge, commentCidsOld, plebbit)).to.equal(true)
    expect(await shouldExcludeChallengeCommentCids(subplebbitChallenge, commentCidsNew, plebbit)).to.equal(false)
    expect(await shouldExcludeChallengeCommentCids(subplebbitChallenge, commentCidsNoAuthorSubplebbit, plebbit)).to.equal(false)
    expect(await shouldExcludeChallengeCommentCids(subplebbitChallenge, commentCidsEmpty, plebbit)).to.equal(false)
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
    const commentCidsHighKarma = ['Qm...friendly-sub.eth,high', 'Qm...friendly-sub.eth,high']
    const commentCidsHighKarmaOld = ['Qm...friendly-sub.eth,high,old', 'Qm...friendly-sub.eth,high']
    const commentCidsHighKarmaNew = ['Qm...friendly-sub.eth,high,new', 'Qm...friendly-sub.eth,high']
    const commentCidsLowKarmaOld = ['Qm...friendly-sub.eth,low,old', 'Qm...friendly-sub.eth,low,old']
    const commentCidsNoAuthorSubplebbit = ['Qm...friendly-sub.eth', 'Qm...friendly-sub.eth']
    const commentCidsEmpty = []
    const commentCidsWrongSubplebbitAddress = ['Qm...wrong.eth,high', 'Qm...wrong.eth,high']
    const commentCidsMoreThanMax = ['Qm...friendly-sub.eth,low', 'Qm...friendly-sub.eth,low', 'Qm...friendly-sub.eth,high']

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
    const commentCidsHighKarma = ['Qm...friendly-sub.eth,high', 'Qm...friendly-sub.eth,high']
    const commentCidsHighKarmaOld = ['Qm...friendly-sub.eth,high,old', 'Qm...friendly-sub.eth,high']
    const commentCidsHighKarmaNew = ['Qm...friendly-sub.eth,high,new', 'Qm...friendly-sub.eth,high']
    const commentCidsLowKarmaOld = ['Qm...friendly-sub.eth,low,old', 'Qm...friendly-sub.eth,low,old']
    const commentCidsLowKarmaNew = ['Qm...friendly-sub.eth,low,new', 'Qm...friendly-sub.eth,low,new']
    const commentCidsNoAuthorSubplebbit = ['Qm...friendly-sub.eth', 'Qm...friendly-sub.eth']
    const commentCidsEmpty = []
    const commentCidsWrongSubplebbitAddress = ['Qm...wrong.eth,high', 'Qm...wrong.eth,high']
    const commentCidsMoreThanMax = ['Qm...friendly-sub.eth,low', 'Qm...friendly-sub.eth,low', 'Qm...friendly-sub.eth,high']

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
