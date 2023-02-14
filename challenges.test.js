require('util').inspect.defaultOptions.depth = null

const {getPendingChallengesOrChallengeVerification, getChallengeVerificationFromChallengeAnswers, getChallengeVerification, plebbitJsChallenges, getSubplebbitChallengeFromSubplebbitChallengeSettings} = require('./challenges')
const {expect} = require('chai')
const {Plebbit, subplebbits, authors, subplebbitAuthors, challengeAnswers, challengeCommentCids, results} = require('./fixtures')

describe("plebbitJsChallenges", () => {
  let TextMathFactory = plebbitJsChallenges['text-math']
  let CaptchaCanvasV3Factory = plebbitJsChallenges['text-math']

  it("returns challenges", () => {
    expect(plebbitJsChallenges).to.not.equal(undefined)
    expect(typeof plebbitJsChallenges).to.equal('object')
    expect(typeof TextMathFactory).to.equal('function')
    expect(typeof CaptchaCanvasV3Factory).to.equal('function')
  })

  it("text-math challenge answer can be eval", async () => {
    const textMath = TextMathFactory()
    const {challenge, verify} = await textMath.getChallenge()
    // the challenge can be eval
    expect(await verify(String(eval(challenge)))).to.deep.equal({success: true})
    expect(await verify('wrong')).to.deep.equal({success: false, error: 'Wrong answer.'})
  })

  it("captcha-canvas-v3 challenge is string", async () => {
    const captchaCanvasV3 = CaptchaCanvasV3Factory()
    const {challenge, verify} = await captchaCanvasV3.getChallenge()
    // the challenge can be eval
    expect(typeof challenge).to.equal('string')
    expect(typeof verify).to.equal('function')
  })
})

describe("getPendingChallengesOrChallengeVerification", () => {
  for (const subplebbit of subplebbits) {
    it(subplebbit.title, async () => {
      for (const author of authors) {
        // mock challenge request with mock publication
        const challengeRequestMessage = {
          publication: {author: {...author, subplebbit: subplebbitAuthors[author.address]?.[subplebbit.title]}},
          // some challenges could require including comment cids in other subs, like friendly subplebbit karma challenges
          challengeCommentCids: challengeCommentCids[author.address],
          // define mock challenge answers in challenge request
          challengeAnswers: challengeAnswers[author.address]?.[subplebbit.title]
        }

        const challengeResult = await getPendingChallengesOrChallengeVerification(challengeRequestMessage, subplebbit)
        const expectedChallengeResult = results[subplebbit.title][author.address]
        // console.log({challengeResult, expectedChallengeResult})
        expect(challengeResult.challengeSuccess).to.equal(expectedChallengeResult.challengeSuccess)
        expect(challengeResult.challengeErrors).to.deep.equal(expectedChallengeResult.challengeErrors)
        expect(challengeResult.pendingChallenges?.length).to.equal(expectedChallengeResult.pendingChallenges?.length)
        if (challengeResult.pendingChallenges?.length) {
          for (const [challengeIndex] of challengeResult.pendingChallenges.entries()) {
            expect(challengeResult.pendingChallenges[challengeIndex].type).to.not.equal(undefined)
            expect(challengeResult.pendingChallenges[challengeIndex].challenge).to.not.equal(undefined)
            expect(typeof challengeResult.pendingChallenges[challengeIndex].verify).to.equal('function')
            expect(typeof challengeResult.pendingChallenges[challengeIndex].index).to.equal('number')
            expect(challengeResult.pendingChallenges[challengeIndex].type).to.equal(expectedChallengeResult.pendingChallenges[challengeIndex].type)
            expect(typeof challengeResult.pendingChallenges[challengeIndex].challenge).to.equal(typeof expectedChallengeResult.pendingChallenges[challengeIndex].challenge)
          }
        }
      }
    })
  }
})

describe("getChallengeVerification", () => {
  const author = {address: 'Qm...'}
  const subplebbit = {
    settings: {
      challenges: [
        // add random exlcuded challenges to tests
        {name: 'fail', exclude: [{address: [author.address]}]},
        // exlcude if other math challenge succeeds
        {name: 'text-math', exclude: [{challenges: [3]}]},
        {name: 'fail', exclude: [{address: [author.address]}]},
        // exlcude if other math challenge succeeds
        {name: 'text-math', exclude: [{challenges: [1]}]},
        {name: 'fail', exclude: [{address: [author.address]}]},
        {name: 'question', options: {
          question: 'What is the password?',
          answer: 'password'
        }}
      ]
    }
  }
  const challengeRequestMessage = {
    publication: {author},
    // define mock challenge answers in challenge request
    challengeAnswers: [undefined, undefined, undefined, undefined, undefined, 'password']
  }

  before(async () => {
    subplebbit.plebbit = await Plebbit()
  })

  it("only 50% of challenges must succeed", async () => {
    // fail the first challenge answer, should still succeed
    const getChallengeAnswersFail1 = (challenges) => {
      return ['wrong', String(eval(challenges[1]))]
    }
    let challengeVerification = await getChallengeVerification(challengeRequestMessage, subplebbit, getChallengeAnswersFail1)
    expect(challengeVerification).to.deep.equal({ challengeSuccess: true })

    // fail only the second challenge, should still succeed
    const getChallengeAnswersFail2 = (challenges) => {
      return ['wrong', String(eval(challenges[1]))]
    }
    challengeVerification = await getChallengeVerification(challengeRequestMessage, subplebbit, getChallengeAnswersFail2)
    expect(challengeVerification).to.deep.equal({ challengeSuccess: true })

    // fail both challenge, should fail
    const getChallengeAnswersFailAll = (challenges) => {
      return ['wrong', 'wrong']
    }
    challengeVerification = await getChallengeVerification(challengeRequestMessage, subplebbit, getChallengeAnswersFailAll)
    expect(challengeVerification.challengeSuccess).to.equal(false)
    expect(challengeVerification.challengeErrors[1]).to.equal('Wrong answer.')
    expect(challengeVerification.challengeErrors[3]).to.equal('Wrong answer.')

    // succeed both challenge
    const getChallengeAnswersSucceedAll = (challenges) => {
      return [String(eval(challenges[0])), String(eval(challenges[1]))]
    }
    challengeVerification = await getChallengeVerification(challengeRequestMessage, subplebbit, getChallengeAnswersSucceedAll)
    expect(challengeVerification).to.deep.equal({ challengeSuccess: true })
  })

  it("getChallengeVerificationFromChallengeAnswers", async () => {
    const challengeResult = await getPendingChallengesOrChallengeVerification(challengeRequestMessage, subplebbit)
    expect(challengeResult.challengeSuccess).to.equal(undefined)
    expect(challengeResult.challengeErrors).to.deep.equal(undefined)
    expect(challengeResult.pendingChallenges?.length).to.equal(2)

    const {pendingChallenges} = challengeResult
    expect(pendingChallenges[0].index).to.equal(1)
    expect(pendingChallenges[1].index).to.equal(3)

    // fail only the first challenge, should still succeed
    const challengeAnswersFail1 = [
      'wrong', String(eval(pendingChallenges[1].challenge))
    ]
    let challengeVerification = await getChallengeVerificationFromChallengeAnswers(pendingChallenges, challengeAnswersFail1, subplebbit)
    expect(challengeVerification).to.deep.equal({ challengeSuccess: true })

    // fail only the second challenge, should still succeed
    const challengeAnswersFail2 = [
      String(eval(pendingChallenges[0].challenge)), 'wrong'
    ]
    challengeVerification = await getChallengeVerificationFromChallengeAnswers(pendingChallenges, challengeAnswersFail2, subplebbit)
    expect(challengeVerification).to.deep.equal({ challengeSuccess: true })

    // fail both challenge, should fail
    const challengeAnswersFailAll = [
      'wrong', 'wrong'
    ]
    challengeVerification = await getChallengeVerificationFromChallengeAnswers(pendingChallenges, challengeAnswersFailAll, subplebbit)
    expect(challengeVerification.challengeSuccess).to.equal(false)
    expect(challengeVerification.challengeErrors[1]).to.equal('Wrong answer.')
    expect(challengeVerification.challengeErrors[3]).to.equal('Wrong answer.')
  })
})

describe("getSubplebbitChallengeFromSubplebbitChallengeSettings", () => {
  // skip these tests when soloing subplebbits
  if (subplebbits.length < 5) {
    return
  }

  it("has challenge prop", () => {
    const subplebbit = subplebbits.filter(subplebbit => subplebbit.title === 'password challenge subplebbit')[0]
    const subplebbitChallenge = getSubplebbitChallengeFromSubplebbitChallengeSettings(subplebbit.settings.challenges[0])
    expect(typeof subplebbitChallenge.challenge).to.equal('string')
    expect(subplebbitChallenge.challenge).to.equal(subplebbit.settings.challenges[0].options.question)
  })

  it("has description prop", () => {
    const subplebbit = subplebbits.filter(subplebbit => subplebbit.title === 'text-math challenge subplebbit')[0]
    const subplebbitChallenge = getSubplebbitChallengeFromSubplebbitChallengeSettings(subplebbit.settings.challenges[0])
    expect(typeof subplebbitChallenge.description).to.equal('string')
    expect(subplebbitChallenge.description).to.equal(subplebbit.settings.challenges[0].description)
  })

  it("has exclude prop", () => {
    const subplebbit = subplebbits.filter(subplebbit => subplebbit.title === 'exclude high karma challenge subplebbit')[0]
    const subplebbitChallenge = getSubplebbitChallengeFromSubplebbitChallengeSettings(subplebbit.settings.challenges[0])
    expect(subplebbitChallenge.exclude).to.not.equal(undefined)
    expect(subplebbitChallenge.exclude).to.deep.equal(subplebbit.settings.challenges[0].exclude)
  })
})