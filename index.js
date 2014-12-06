var rework = require('rework');
var path = require('path');
var through = require('through2');

var isAbsolute = function(p) {
    var normal = path.normalize(p);
    var absolute = path.resolve(p);

    if (process.platform === 'win32') {
        absolute = absolute.replace(/^[a-z]:/i, '');
    }
    return normal === absolute;
},
isURL = function(url){
    var testPart = url.substr(0,6);
    if (testPart === "http:/" || testPart === "https:"){
      return true;
    }
    return testPart.substr(0, 2) === "//";
};

var rebaseUrls = function(css, options) {
    return rework(css)
        .use(rework.url(function(url){
            if (/^(data:.*;.*,)/.test(url) || isURL(url)) {
                return url;
            }
            if (isAbsolute(url)) {
                var p = url;
            }
            else {
                var absolutePath = path.join(options.currentDir, url)
                var p = path.relative(options.root, absolutePath);

                if (process.platform === 'win32') {
                    p = p.replace(/\\/g, '/');
                }
                if (options.convertToAbsolute) {
                    p = "/" + p;
                }
            }
            if (typeof options.urlProcess === 'function') {
                return options.urlProcess(p, isAbsolute);
            }
            return p;
        }))
        .toString();
};

module.exports = function(options) {
    options = options || {};
    var root = options.root || '.';
    var convertToAbsolute = options.convertToAbsolute || false;

    return through.obj(function(file, enc, cb) {
        var css = rebaseUrls(file.contents.toString(), {
            currentDir: path.dirname(file.path),
            root: path.join(file.cwd, root),
            urlProcess: options.urlProcess,
            convertToAbsolute: convertToAbsolute
        });

        file.contents = new Buffer(css);

        this.push(file);
        cb();
    });
};
