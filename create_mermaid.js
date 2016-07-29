var fs = require('fs');
var format = require('util').format;

var data = fs.readFileSync('data.csv', 'utf-8');
var lines = data.split('\n').filter(function (line) { return line.length > 1; });

var lambdaNodes = [];
var snsNodes = [];
var s3Nodes = [];

var links = '';

var dotText = 'digraph G {\n';

lines.forEach(function (line) {
  var source = line.split(',')[0];
  var dest = line.split(',')[1];
  if (! (source && dest)) return;

  // We don't want prod
  if(/prod/.test(source)) return;
  if(/prod/.test(dest)) return;

  var sourceType = guessType(source);
  var destType = guessType(dest);

  var sourceText, destText;

  if (sourceType === 's3') {
    sourceText = format('%s{%s}', source, shortName(source));
    if (s3Nodes.indexOf(source) === -1) { s3Nodes.push(source); }
    //console.log('\tclass %s nodeS3;', source);
  } else if (sourceType === 'sns') {
    sourceText = format('%s[%s]', source, shortName(source));
    if (snsNodes.indexOf(source) === -1) { snsNodes.push(source); }
    //console.log('\tclass %s nodeSNS;', source);
  } else if (sourceType === 'lambda') {
    sourceText = format('%s>%s]', source, shortName(source));
    if (lambdaNodes.indexOf(source) === -1) { lambdaNodes.push(source); }
    //console.log('\tclass %s nodeLambda;', source);
  } else {
    sourceText = format('%s>%s]', source, source);
    // console.log('Unknown source type: %s', sourceType);
    // throw new Error('boom');
  }

  if (destType === 's3') {
    destText = format('%s{%s}', dest, shortName(dest));
    if (s3Nodes.indexOf(dest) === -1) { s3Nodes.push(dest); }
    //console.log('\tclass %s nodeS3;', dest);
  } else if (destType === 'sns') {
    destText = format('%s[%s]', dest, shortName(dest));
    if (snsNodes.indexOf(dest) === -1) { snsNodes.push(dest); }
    //console.log('\tclass %s nodeSNS;', dest);
  } else if (destType === 'lambda') {
    destText = format('%s>%s]', dest, shortName(dest));
    if (lambdaNodes.indexOf(dest) === -1) { lambdaNodes.push(dest); }
    //console.log('\tclass %s nodeLambda;', dest);
  } else {
    destText = format('%s>%s]', dest, shortName(dest));
    //console.error('******************** Unknown destination type: %s', destType);
    //throw new Error('boom');
  }

  var linkText;
  if (sourceType === 'lambda' && destType === 'lambda') {
    linkText = '-- invokes -->';
  } else if (sourceType === 'lambda' && destType === 'sns') {
    linkText = '-- publishes to -->';
  } else if (sourceType === 'lambda' && destType === 's3') {
    linkText = '-- writes to -->';
  } else if (sourceType === 's3' && destType === 'lambda') {
    linkText = '-- sends events to -->';
  } else if (sourceType === 'sns' && destType === 'lambda') {
    linkText = '-- notifies -->';
  } else {
    linkText = '-->';
  }
  links += format('\t%s%s%s;\n', sourceText, linkText, destText);

  var src = shortName(source);
  var dst = shortName(dest);
  var edgeLabel = linkText.replace(/--/g, '').replace('>', '').trim();
  var srcColor = sourceType === 's3' ? 'yellow':
        (sourceType === 'lambda' ? 'lightgreen' :
         (sourceType === 'sns' ? 'lightblue'
          : 'white'));
  var srcShape = 'egg';
  dotText += format('\t"%s" -> "%s" [label="%s" style=filled fillcolor=%s];\n',
                    src, dst, edgeLabel, srcColor);
  dotText += format('\t"%s" [shape=%s fillcolor=%s style=filled]\n', src, srcShape, srcColor);
  var dstColor = destType === 's3' ? 'yellow':
        (destType === 'lambda' ? 'lightgreen' :
         (destType === 'sns' ? 'lightblue'
          : 'white'));
  dotText += format('\t"%s" [shape=%s fillcolor=%s style=filled]\n', dst, srcShape, dstColor);
});

dotText += '\n}';

console.error(dotText);

console.log('graph LR;');
console.log('\tclassDef nodeLambda fill:#393;');
console.log('\tclassDef nodeSNS fill:#339;');
console.log('\tclassDef nodeS3 fill:#660;');
console.log(links);
console.log('\tclass %s nodeLambda;', lambdaNodes.join(','));
console.log('\tclass %s nodeSNS;', snsNodes.join(','));
console.log('\tclass %s nodeS3;', s3Nodes.join(','));


var L = require('lodash');

var sources = L.map(lines, function (line) {
  return line.split(',')[0];
});

var destinations = L.map(lines, function (line) {
  return line.split(',')[1];
});

var x = L.difference(destinations, sources).filter(function (o) { return guessType(o) === 'lambda';});

process.stderr.write('Found lambdas with no outgoing edges\n');
process.stderr.write('(They might not be instrumented yet or don\'t call anything else)\n\n');
process.stderr.write(x.join('\n') + '\n');


function guessType (id) {
  if (id.startsWith('s3:')) {
    return 's3';
  } else if (/\:sns\:/.test(id)) {
    return 'sns';
  } else if (/lambda/.test(id)) {
    return 'lambda';
  } else if (/.+\:.+/.test(id)) {
    return 'custom';
  } else {
    return 'lambda'; // FIXME: not actually very reliable
  }
}

//
// Turn something like:
// "arn:aws:sns:eu-west-1:8xxxxxxxxxxx2:search-request-v1-ci"
// into just "search-request-v1-ci"
//
function shortName (id) {
  var type = guessType(id);
  if (type === 's3') {
    return 'S3: ' + id.substr(3, id.length);
  } else if (type === 'sns') {
    var parts = id.split(':');
    return 'SNS: ' + parts[parts.length - 1];
  } else if (type === 'lambda') {
    if (id.indexOf(':') !== -1) {
      var split = id.split(':');
      if (split.length >= 7) {
        return 'λ: ' + split[6];
      } else if (split.length === 2) {
        return split[0]; // SNS -> lambda subscription
      } else if (split.length === 4) {
        return split[2];
      } else {
        return 'λ: ' + split[split.length - 1];
      }
    }  else {
      return 'λ: ' + id;
    }
  } else if (type === 'custom') {
    return id;
  } else {
    return id;
  }
}
