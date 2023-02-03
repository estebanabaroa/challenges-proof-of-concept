const hasCooledDown = (publication, cooldown) => {
  // keep track of how often an author publishes, cooldown 1 = 1 second
  return true
}

const getChallengeVerification = async ({whitelist = '', cooldown = '1'} = {}, challengeAnswer, publication) => {
  whitelist = whitelist.split(',')
  cooldown = Number(cooldown)
  const whitelistSet = new Set(whitelist)

  if (!whitelistSet.has(publication?.author?.address)) {
    return {
      success: false,
      error: 'Author address not whitelisted.'
    }
  }

  if (!hasCooledDown(publication, cooldown)) {
    return {
      success: false,
      error: 'Author address whitelisted but not cooled down.'
    }
  }

  return {
    success: true
  }
}

module.exports = {getChallengeVerification}
