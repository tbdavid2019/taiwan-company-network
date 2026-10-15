// Remove old published paths from Git's index in one recursive operation.
// `gh-pages` otherwise expands every generated SVG into a command argument,
// which exceeds the operating system argument limit after many static assets.
module.exports = (git) => git.exec("rm", "--cached", "-r", "-f", "--", ".");
