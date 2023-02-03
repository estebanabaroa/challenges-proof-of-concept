
const getChallenge = async ({blacklist = ''} = {}, publication) => {
  blacklist = blacklist.split(',')
  const blacklistSet = new Set(blacklist)

  if (blacklistSet.has(publication?.author?.address)) {
    return {
      success: false,
      error: 'Author address is blacklisted.'
    }
  }

  return {
    success: true
  }
}

module.exports = {getChallenge}
