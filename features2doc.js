#!/usr/bin/env node

// MODULES
const { program } = require('commander');
const fs = require('fs');
const glob = require('glob');
const handlebars = require('handlebars');
const linereader = require('line-reader');
const path = require('path');
const async = require('async');
const moment = require('moment');
const i18n = require('i18next');
const config = require('./config');
const pdf = require('./html2pdf');

// options
program
  .version(require('./package.json').version)
  .option('-a, --author <string>', 'The author name used in header (default: Author Name)')
  .option('-b, --break-before-word <string>', 'create a line break before every occurrance of this word in the background (default: null)')
  .option('-d, --product-description <string>', 'The description of your product used in header (default: My Product Description)')
  .option('-g, --generate-pdf <false|true>', ' generate PDF file(default: true)')
  .option('-l, --lang <en|string>', 'language used in feature files (default: en)')
  .option('-p, --product-name <string>', 'The name of your product used in headline and header (default: My Product Name)')
  .option('-t, --templates-dir <path>', 'read the files doc_template.html, feature_template.html and style.css from path (default: default/templates)')
  .option('-w, --tags <string...>', 'Filters the final output to this categories/tag')
  .option('-m, --date-format <string>', 'date mask for document date in moment lib format (default: LL)')
  .option('-x, --debug', 'output extra debugging')
  .option('-o, --output-folder <path>', 'Send output to folder path (default: output)')

// commands
program
  .requiredOption('-i, --input-dir <path>', 'Read feature files from path (default: examples/features)')
  .command('create')
  .option('-a, --author <string>', 'The author name used in header (default: Author Name)')
  .option('-b, --break-before-word <string>', 'create a line break before every occurrance of this word in the background (default: null)')
  .option('-d, --product-description <string>', 'The description of your product used in header (default: My Product Description)')
  .option('-g, --generate-pdf <false|true>', ' generate PDF file(default: true)')
  .option('-l, --lang <en|string>', 'language used in feature files (default: en)')
  .option('-p, --product-name <string>', 'The name of your product used in headline and header (default: My Product Name)')
  .option('-t, --templates-dir <path>', 'read the files doc_template.html, feature_template.html and style.css from path (default: default/templates)')
  .option('-w, --tags <string...>', 'Filters the final output to this categories/tag')
  .option('-m, --date-format <string>', 'date mask for document date in moment lib format (default: LL)')
  .option('-x, --debug', 'output extra debugging')
  .option('-o, --output-folder <path>', 'Send output to folder path (default: output)')
  .description('Create HTML or PDF from feature files')
  .action(createCommand);

// Check if called without command
if (process.argv.length < 3) {
  program.help();
}

function resolvePath(folderPath) {
  return path.resolve(folderPath.replace(/^["|'](.*)["|']$/, '$1'));
}
// parse commands
program.parse(process.argv);

//debug commander
if (program.debug) console.log(program.opts());

function setup(done) {
  var programOptions = program.opts();
  
  config.INPUTDIR = resolvePath(programOptions.inputDir) || config.INPUTDIR;
  config.TEMPLATESDIR = programOptions.templatesDir || config.TEMPLATESDIR;
  config.OUTPUTFOLDER = resolvePath(programOptions.outputFolder || config.OUTPUTFOLDER);
  config.LANGUAGE = programOptions.lang || config.LANGUAGE;
  config.AUTHOR = programOptions.author || config.AUTHOR;
  config.PRODUCTNAME = programOptions.productName || config.PRODUCTNAME;
  config.PRODUCTDESCRIPTION = programOptions.productDescription || config.PRODUCTDESCRIPTION;
  config.BREAKBEFOREWORD = programOptions.breakBeforeWord || config.BREAKBEFOREWORD;
  config.GENERATEPDF = programOptions.generatePdf || config.GENERATEPDF;
  config.TAGS = programOptions.tags?programOptions.tags : config.TAGS;
  config.HEADERTEMPLATE = config.TEMPLATESDIR + '/header_template.html';
  config.FOOTERTEMPLATE = config.TEMPLATESDIR + '/footer_template.html';
  config.COVERTEMPLATE = config.TEMPLATESDIR + '/cover_template.html';
  config.DOCTEMPLATE = config.TEMPLATESDIR + '/doc_template.html';
  config.FEATURETEMPLATE = config.TEMPLATESDIR + '/feature_template.html';
  config.RESUMETEMPLATE = config.TEMPLATESDIR + '/resume_template.html';
  config.LOGOIMAGE = config.TEMPLATESDIR + '/logo.png';
  config.DATEFORMAT = programOptions.dateFormat || config.DATEFORMAT; 

  i18n.init({
    lng: config.LANGUAGE,
    debug: false,
    fallbackLng: ['pt'],
    load: config.LANGUAGE,
    returnNull: true,
    returnEmptyString: true,
    returnObjects: true,
    joinArrays: true,
    resources: require('./locales/translation.json'),
  }, (err, t) => {
    if (err) return console.error(err)
    done();
  });
}

function createCommand() {
  setup(create);
}

async function create() {
  var pathHTMLCoverTemplate = path.resolve(config.COVERTEMPLATE);
  var pathHTMLTemplate = path.resolve(config.DOCTEMPLATE);
  var pathHTMLFeatureTemplate = path.resolve(config.FEATURETEMPLATE);
  var pathHTMLResumeTemplate = path.resolve(config.RESUMETEMPLATE);

  var bulmaStyle = path.resolve(config.TEMPLATESDIR + '/bulma.css');
  var pathStyle = path.resolve(config.TEMPLATESDIR + '/style.css');

  var coverHandlebarTemplate = handlebars.compile(fs.readFileSync(pathHTMLCoverTemplate, config.FILE_ENCODING));
  var docHandlebarTemplate = handlebars.compile(fs.readFileSync(pathHTMLTemplate, config.FILE_ENCODING));
  var featureHandlebarTemplate = handlebars.compile(fs.readFileSync(pathHTMLFeatureTemplate, config.FILE_ENCODING));
  var resumeHandlebarTemplate = handlebars.compile(fs.readFileSync(pathHTMLResumeTemplate, config.FILE_ENCODING));
  var cssStyles = fs.readFileSync(pathStyle, config.FILE_ENCODING);
  cssStyles += fs.readFileSync(bulmaStyle, config.FILE_ENCODING) + '\n' + cssStyles;
  parseFeatures(function (features) {
    var tocHtml = '';
    var featuresHtml = '';
    if (features) {
      var categoriesData = {}
      for (var i = 0; i < features.length; i++) {
        var hasData = false;
        if (features[i].categories) {
          // añadir categorias
          features[i].categories.forEach((category) => {
            if (!config.TAGS || config.TAGS.length === 0 || config.TAGS.includes(category) || 
              (features[i].tags && features[i].tags.find((tag) => {
                return config.TAGS.includes(tag)
              })) ) {
              hasData = true;
              // crear categoría si no existe
              if (!categoriesData[category]) {
                categoriesData[category] = {
                  name: category.substring(1),
                  features: []
                };
              }

              // añadir tags a la categoría
              if (features[i].tags) {
                if (!categoriesData[category].tags) {
                  categoriesData[category].tags = []
                }

                features[i].tags.forEach((tag) => {
                  if (!categoriesData[category].tags.includes(tag)) {
                    categoriesData[category].tags.push(tag);
                  }
                })
              }

              // añadir feature a la lista de features
              categoriesData[category].features.push({
                name: features[i].name,
                anchor: features[i].anchor,
                background: features[i].background,
                scenarios: features[i].scenarios.map((scenarioTmp) => { 
                  return {name: scenarioTmp.name }
                })
              });
            }
          })
        } else if (features[i].tags) {
          features[i].tags.forEach((tag) => {
            if (!config.TAGS || config.TAGS.length === 0 || config.TAGS.includes(tag)) {
              hasData = true;
              if (!categoriesData[tag]) {
                categoriesData[tag] = {
                  name: tag.substring(1),
                  features: []
                };
              }

              categoriesData[tag].features.push({
                name: features[i].name,
                anchor: features[i].anchor,
                background: features[i].background,
                scenarios: features[i].scenarios.map((scenarioTmp) => { 
                  return {name: scenarioTmp.name }
                })
              });
            }
          })
        }

        if (hasData) {
          featuresHtml += featureHandlebarTemplate(features[i]);
        }
      }

      Object.values(categoriesData).forEach((categoryData) => {
        tocHtml += resumeHandlebarTemplate(categoryData);
      })
    }

    
    var docData = new Object();
    docData.cssStyles = cssStyles;
    docData.creationdate = moment().format(config.DATEFORMAT);
    docData.author = config.AUTHOR;
    docData.productname = config.PRODUCTNAME;
    docData.productdescription = config.PRODUCTDESCRIPTION;
    docData.tocHtml = tocHtml;
    docData.featuresHtml = featuresHtml;
    docData.logoImage = fs.readFileSync(config.LOGOIMAGE, 'base64');
    
    docData.coverHtml = coverHandlebarTemplate(docData);    

    var docHtml = docHandlebarTemplate(docData);

    // Verify extra configurations for the pdf
    var pdfExtraConfig = {}

    var pathHTMLHeaderTemplate = path.resolve(config.HEADERTEMPLATE);
    if (fs.existsSync(pathHTMLHeaderTemplate)) {
      var headerHandlebarTemplate = handlebars.compile(fs.readFileSync(pathHTMLHeaderTemplate, config.FILE_ENCODING));
      pdfExtraConfig.headerTemplate = headerHandlebarTemplate(docData);
    }
  
    var pathHTMLFooterTemplate = path.resolve(config.FOOTERTEMPLATE);
    if (fs.existsSync(pathHTMLFooterTemplate)) {
      var footerHandlebarTemplate = handlebars.compile(fs.readFileSync(pathHTMLFooterTemplate, config.FILE_ENCODING));
      pdfExtraConfig.footerTemplate = footerHandlebarTemplate(docData);
    }
    
    // write to default output dir. Create first if necessary
    console.log('Output directory: ' + config.OUTPUTFOLDER);
    fs.mkdir(config.OUTPUTFOLDER, { recursive: true }, async function (e) {
      if (!e || (e && e.code === 'EEXIST')) {
        var outputFolderpath = `${config.OUTPUTFOLDER}/Features.html`;
        writeOutput(docHtml, outputFolderpath).then((value) => {
          console.log('HTML successfully created in -> ' + path.resolve(value))
          if (config.GENERATEPDF == true || config.GENERATEPDF == "true") {
            pdf.generatePDF(path.resolve(outputFolderpath), config.OUTPUTFOLDER, pdfExtraConfig);
          } else {
            console.log('Finished!!!');
          }
        });
      } else {
        console.log(e);
      }
    });
  });
}

function writeOutput(html, outputfile) {
  return new Promise(function (resolve, reject) {
    fs.writeFile(outputfile, html, config.FILE_ENCODING, function (err) {
      if (err) reject(err);
      else resolve(outputfile);
    });
  });
}

function parseFeatures(callback) {
  var featureFiles = [];
  console.log('Input dir: ' + config.INPUTDIR);
  if (fs.lstatSync(config.INPUTDIR).isDirectory() == true) {
    featureFiles = glob.sync(`${config.INPUTDIR}/**/*.feature*`, { absolute: path.isAbsolute(config.INPUTDIR) }).sort();
  } else {
    if (fs.lstatSync(config.INPUTDIR).isFile() == true && config.INPUTDIR.endsWith('.feature')) {
      featureFiles = [config.INPUTDIR];
    } else {
      console.error("Input path invalid, expect a directory or file .feature. But found " + config.INPUTDIR);
      process.exit(1);
    }
  }
  async.mapSeries(featureFiles, parseFeatureFile, function (err, results) {
    callback(results);
  });
}

function parseFeatureFile(featureFilename, callback) {
  console.log('Feature file: ' + featureFilename);
  var feature = new Object();
  feature.background = '';
  feature.scenarios = [];
  // feature.tags = [];
  // feature.categories = [];
  var scenario = new Object();
  scenario.content = '';

  var foundMultirowScenario = false;
  var featureLineWasFound = false;
  var scenariosStarted = false;

  linereader.eachLine(featureFilename, function (line) {
    if (line && line.trim()) {
      line = line.trim();

      if (isTag(line)) {
        if (!featureLineWasFound) {
          if (!feature.tags) {
            feature.tags = []
          }
          feature.tags.push(line);

          if (!feature.allTags) {
            feature.allTags = []
          }
          feature.allTags.push(line);
        }
      } else if (isComment(line)) {
        if (!featureLineWasFound) {
          if (!feature.categories) {
            feature.categories = []
          }
          feature.categories.push(line);

          if (!feature.allTags) {
            feature.allTags = []
          }
          feature.allTags.push(line);
        }
      } else {
        if (lineIndicatesThatANewScenarioBegins(line) && foundMultirowScenario) {
          // new scenario found. start parsing new scenario
          feature.scenarios.push(scenario);
          scenario = new Object();
          scenario.content = '';
          foundMultirowScenario = false;
          scenariosStarted = true;
        }
    
        if (lineIndicatesThatANewScenarioBegins(line) || foundMultirowScenario) {
          // We are parsing a scenario. It may be a new scenario or a row within a scenario
          foundMultirowScenario = true;
          scenariosStarted = true;
    
          // Handle sidenote
          if (i18nStringContains(line, 'sidenote')) {
            scenario.sidenote = line.replace(i18n.t('sidenote'), '');
          } else {
            // Handle scenario content
            if (scenario.content) {
              if (i18nStringContains(line, 'allsteps')) {
                scenario.content = scenario.content + '<br/>' + i18nStringClass(line, 'allsteps', 'has-text-weight-bold');
              } else {
                scenario.content = scenario.content + '<br/><i>' + line + '</i>';
              } 
            } else {
              scenario.name = '<span class="has-text-weight-bold">' + i18nStringClass(line, 'scenario', 'has-text-success') + "</span>";
              scenario.content = scenario.name;
            }
          }
        }
    
        if (!i18nStringContains(line, 'feature') && !scenariosStarted && featureLineWasFound) {
          // Everything between feature and first scenario goes into feature.background, except background keyword
          var fixedline = config.BREAKBEFOREWORD ? line.replace(config.BREAKBEFOREWORD, '</p><p class="p-after-p">' + config.BREAKBEFOREWORD) : line;
          fixedline = fixedline + '<br/>';
          feature.background = feature.background + ' ' + fixedline.replace(i18n.t('background'), '');
        }
    
        if (i18nStringContains(line, 'feature')) {
          feature.name = i18nStringReplace(line, 'feature')
          feature.anchor = encodeURIComponent(feature.name)
          featureLineWasFound = true;
        }
      }
    }
  }).then(function () {
    // Add last scenario, if exists
    if (scenario && scenario.content) {
      feature.scenarios.push(scenario);
    }
    callback(null, feature);
  });

}

function i18nStringClass(orgstring, i18nkey, colorClassName) {
  var tr = i18n.t(i18nkey);

  if (Array.isArray(tr)) {
    var finalLine = orgstring
    tr.forEach((trtmp) => {
      finalLine = finalLine.replace(trtmp, `<span class="${colorClassName}">${trtmp}</span>` || '');
    })

    return finalLine.trim()
  } else {
    return orgstring.replace(tr, `<span class="${colorClassName}">${tr}</span>` || '');
  }
}

function i18nStringReplace(orgstring, i18nkey, replacement) {
  var tr = i18n.t(i18nkey);
  if (Array.isArray(tr)) {
    var finalLine = orgstring
    tr.forEach((trtmp) => {
      finalLine = finalLine.replace(trtmp, replacement || '');
    })

    return finalLine.trim()
  } else {
    return orgstring.replace(tr, '').trim();
  }
}

function isTag(line) {
  return line.startsWith('@')  
}

function isComment(line) {
  return line.startsWith('#')  
}

function lineIndicatesThatANewScenarioBegins(line) {
  return i18nStringContains(line, 'scenario') || i18nStringContains(line, 'scenario_outline') || i18nStringContains(line, 'sidenote') || i18nStringContains(line, 'background');
}

function i18nStringContains(orgstring, i18nkey) {
  var tr = i18n.t(i18nkey);
  if (Array.isArray(tr)) {
    return tr.map(v => orgstring.indexOf(v) !== -1).indexOf(true) !== -1
  } else {
    return orgstring.indexOf(i18n.t(i18nkey)) !== -1;
  }
}

module.exports = {
  output: [
    program
  ]
}