var ip4DecimalPattern = '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))$';
var ip4HexPattern = '^(?:(?:0x[0-9a-f]{1,2})\.){3}(?:0x[0-9a-f]{1,2})$';
var ip4OctalPattern = '^(?:(?:03[1-7][0-7]|0[12][0-7]{1,2}|[0-7]{1,2})\.){3}(?:03[1-7][0-7]|0[12][0-7]{1,2}|[0-7]{1,2})$';


// like trim() helper from underscore.string:
// trims chars from beginning and end of str
function trim(str, chars) {
  // escape any regexp chars
  chars = chars.replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1');
  return str.replace(new RegExp('^' + chars + '+|' + chars + '+$', 'g'), '');
}

exports.trim = trim;

// https://developers.google.com/safe-browsing/v4/urls-hashing#canonicalization
function canonicalizeHost(host) {
  // Remove all leading and trailing dots
  var canonicalizedHost = trim(host, '.');

  // Replace consecutive dots with a single dot
  canonicalizedHost = canonicalizedHost.replace(new RegExp('[\.]+', 'g'), '.');

  // If the hostname can be parsed as an IP address,
  // normalize it to 4 dot-separated decimal values.
  // The client should handle any legal IP-address encoding,
  // including octal, hex, and TODO: fewer than four components
  var isIP4Decimal = isIP4Hex = isIP4Octal = false;
  var base = 10;

  isIP4Decimal = canonicalizedHost.match(ip4DecimalPattern) != null;
  isIP4Hex = canonicalizedHost.match(ip4HexPattern) != null;
  isIP4Octal = canonicalizedHost.match(ip4OctalPattern) != null;
  if (isIP4Hex || isIP4Octal) {
    if (isIP4Hex) {
      base = 16;
    } else if (isIP4Octal) {
      base = 8;
    }
    canonicalizedHost = canonicalizedHost.split('.').map(num => parseInt(num, base)).join('.');
  }

  // Lowercase the whole string
  canonicalizedHost = canonicalizedHost.toLowerCase();
  return canonicalizedHost;
}

exports.canonicalizeHost = canonicalizeHost;
