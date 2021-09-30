// Quick versions of document.querySelector and document.querySelectorAll
module.exports = {
  q: s => document.querySelector(s),
  qA: s => document.querySelectorAll(s),
}
