export const getType = (path) => {
  const dot = path.lastIndexOf('.')
  return path.slice(dot + 1)
}

const getCodeByRange = (codeLines, { beginLine, beginColumn, endLine, endColumn }) => {
  if (beginLine === endLine) {
    return codeLines[beginLine - 1].slice(beginColumn - 1, endColumn)
  }
  const lines = codeLines.slice(beginLine, endLine + 1)
  lines[0] = lines[0].slice(beginColumn)
  const idx = lines.length - 1
  lines[idx] = lines[idx].slice(0, endColumn)
  lines.forEach(s => s.trim())
  return lines.join(' ')
}

export const getCodeGetterByElement = (code) => {
  const codeLines = code.split('\n')
  return (elem) => getCodeByRange(codeLines, elem.range)
}

export const escapeQuotes = (s) => {
  return s.replace(/(^|[^\\])"/g, '$1\\"')
}
