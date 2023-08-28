let isIe = false
if (typeof window !== 'undefined') {
  isIe = window.navigator.userAgent.match(/MSIE|Trident/) !== null
}

export { isIe }
