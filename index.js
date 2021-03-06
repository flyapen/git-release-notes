#!/usr/bin/env node
var argv = require("optimist").usage("release-notes [<options>] <since>..<until> <template>")
.options("f", {
	"alias" : "file"
})
.options("p", {
	"alias" : "path",
	"default" : process.cwd()
})
.options("t", {
	"alias" : "title",
	"default" : "(.*)"
})
.options("m", {
	"alias" : "meaning",
	"default" : ['type']
})
.options("b", {
	"alias" : "branch",
	"default" : "master"
})
.describe({
	"f" : "Configuration file",
	"p" : "Git project path",
	"t" : "Commit title regular expression",
	"m" : "Meaning of capturing block in title's regular expression",
	"b" : "Git branch, defaults to master"
})
.boolean("version")
.check(function (argv) {
	if (argv._.length == 2) {
		return true;
	}
	throw "Invalid parameters, please specify an interval and the template";
})
.argv;

var git = require("./lib/git");
var fs = require("fs");
var ejs = require("ejs");
var path = require("path");

var template = argv._[1];
if (!fs.existsSync(template)) {
	// Template name?
	if (template.match(/[a-z]+(\.ejs)?/)) {
		template = path.resolve(__dirname, "./templates/" + path.basename(template, ".ejs") + ".ejs");
	} else {
		require("optimist").showHelp();
		console.error("\nUnable to locate template file " + template);
		process.exit(1);
	}
}
fs.readFile(template, function (err, templateContent) {
	if (err) {
		require("optimist").showHelp();
		console.error("\nUnable to locate template file " + argv._[1]);
		process.exit(5);
	} else {
		getOptions(function (options) {
			git.log({
				branch : options.b,
				range : argv._[0],
				title : new RegExp(options.t),
				meaning : Array.isArray(options.m) ? options.m : [options.m],
				cwd : options.p
			}, function (commits) {
				var output = ejs.render(templateContent.toString(), {
					commits : commits
				});
				process.stdout.write(output + "\n");
			});
		});
	}
});

function getOptions (callback) {
	if (argv.f) {
		fs.readFile(argv.f, function (err, data) {
			if (err) {
				console.error("Unable to read configuration file\n" + err.message);
			} else {
				var options;
				try {
					var stored = JSON.parse(data);
					options = {
						b : stored.b || stored.branch || argv.b,
						t : stored.t || stored.title || argv.t,
						m : stored.m || stored.meaning || argv.m,
						p : stored.p || stored.path || argv.p
					};
				} catch (ex) {
					console.error("Invalid JSON in configuration file");
				}
				if (options) {
					callback(options);
				}
			}
		});
	} else {
		callback(argv);
	}
}