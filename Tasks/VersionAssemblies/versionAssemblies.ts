import * as tl from 'vso-task-lib/vsotask';
import * as sh from 'shelljs';
import * as fs from 'fs';

tl.debug("Starting Version Assemblies step");

// get the task vars
var sourcePath = tl.getPathInput("sourcePath", true, true);
var filePattern = tl.getInput("filePattern", true);
var buildRegex = tl.getInput("buildRegex", true);
var buildRegexIndex = tl.getInput("buildRegexIndex", false);
var replaceRegex = tl.getInput("replaceRegex", false);
var replacePrefix = tl.getInput("replacePrefix", false);
var failIfNoMatchFoundStr = tl.getInput("failIfNoMatchFound", false);

var failIfNoMatchFound = false;
if (failIfNoMatchFoundStr === 'true') {
    failIfNoMatchFound = true;
}

// get the build number from the env vars
var buildNumber = tl.getVariable("Build.BuildNumber");

tl.debug(`sourcePath :${sourcePath}`);
tl.debug(`filePattern : ${filePattern}`);
tl.debug(`buildRegex : ${buildRegex}`);
tl.debug(`buildRegexIndex : ${buildRegexIndex}`);
tl.debug(`replaceRegex : ${replaceRegex}`);
tl.debug(`replacePrefix : ${replacePrefix}`);
tl.debug(`failIfNoMatchFound : ${failIfNoMatchFound}`);
tl.debug(`buildNumber : ${buildNumber}`);

if (replaceRegex === undefined || replaceRegex.length === 0){
	replaceRegex = buildRegex;
}
tl.debug(`Using ${replaceRegex} as the replacement regex`);

if (buildRegexIndex === undefined || buildRegexIndex.length === 0){
	buildRegexIndex = "0";
}
tl.debug(`Using ${buildRegexIndex} as the build regex index regex`);

var buildRegexObj = new RegExp(buildRegex);
if (buildRegexObj.test(buildNumber)) {
	var versionNum = buildRegexObj.exec(buildNumber)[buildRegexIndex];
	console.info(`Using prefix [${replacePrefix}] and version [${versionNum}] in folder [${sourcePath}]`);
	
    // get a list of all files under this root
    var allFiles = tl.find(sourcePath);

    // Now matching the pattern against all files
    var filesToReplace = tl.match(allFiles, filePattern, { matchBase: true });
	
	if (filesToReplace === undefined || filesToReplace.length === 0) {
		tl.warning("No files found");
	} else {
		for (var i = 0; i < filesToReplace.length; i++) {
            var file = filesToReplace[i];
            console.info(`  -> Changing version in ${file}`);
            
            var contents = fs.readFileSync(file, 'utf8').toString();
            var checkMatches = new RegExp(replaceRegex).exec(contents);
            if (!checkMatches || checkMatches.length === 0) {
                if (failIfNoMatchFound) {
                    tl.error(`No matches for regex [${replaceRegex}] found in file ${file}`);
                    process.exit(1);
                } else {
                    tl.warning(`No matches for regex [${replaceRegex}] found in file ${file}`);
                }
            } else {
                console.info(`${checkMatches.length} matches for regex [${replaceRegex}] found in file ${file}`);
                
                // make the file writable
                sh.chmod(666, file);
                // replace all occurrences by adding g to the pattern
                sh.sed("-i", new RegExp(replaceRegex, "g"), replacePrefix + versionNum, file);
            }
        }
		console.info(`Processed ${filesToReplace.length} files`);
	}
} else {
	tl.warning(`Could not extract a version from [${buildNumber}] using pattern [${buildRegex}]`);
}

tl.debug("Leaving Version Assemblies step");