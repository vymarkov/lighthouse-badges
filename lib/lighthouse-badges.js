const badge = require('gh-badges');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const ReportGenerator = require('lighthouse/lighthouse-core/report/report-generator');
const exec = promisify(require('child_process').exec);
const { percentageToColor } = require('./calculations');

// Buffer size for stdout, must be big enough to handle lighthouse CLI output
const maxBuffer = 1024 * 50000;

const metricsToSvg = async (lighthouseMetrics, badgeStyle) => {
  const metricKeys = Object.keys(lighthouseMetrics);
  for (let i = 0; i < metricKeys.length; i += 1) {
    const badgeColor = percentageToColor(lighthouseMetrics[metricKeys[i]]);
    const badgeText = [metricKeys[i], `${lighthouseMetrics[metricKeys[i]]}%`];

    badge.loadFont(path.join(__dirname, '..', 'assets', 'fonts', 'Verdana.ttf'), () => {
      badge({ text: badgeText, colorscheme: badgeColor, template: badgeStyle }, (svg) => {
        const filepath = path.join(process.cwd(), `${metricKeys[i].replace(/ /g, '_')}.svg`);
        fs.writeFile(filepath, svg, () => console.log(`Saved file to ${filepath}`));
      });
    });
  }
};

const htmlReportsToFile = async (htmlReports) => {
  for (let i = 0; i < htmlReports.length; i += 1) {
    const report = Object.values(htmlReports[i])[0];
    if (report) {
      const url = Object.keys(htmlReports[i])[0];
      const escapedUrl = url.toLowerCase().replace(/(^\w+:|^)\/\//, '').replace(/[^a-z0-9]/g, '_');
      const filepath = path.join(process.cwd(), `${escapedUrl}.html`);
      fs.writeFile(filepath, report, () => console.log(`Saved report to ${filepath}`));
    }
  }
};


const getLighthouseMetrics = async (url, htmlReportToggle) => {
  const lighthouseBinary = path.join(__dirname, '..', 'node_modules', '.bin', 'lighthouse');
  const params = '--chrome-flags=\'--headless\' --output=json --output-path=stdout --quiet';
  const lighthouseCommand = `${lighthouseBinary} ${params} ${url}`;
  try {
    const { stdout } = await exec(`${lighthouseCommand}`, { maxBuffer });
    const results = JSON.parse(stdout);
    const htmlReport = htmlReportToggle ? ReportGenerator.generateReportHtml(results) : false;
    const { categories } = results;
    const scores = Object.keys(categories).map(category => (
      { [`lighthouse ${category.toLowerCase()}`]: categories[category].score * 100 }
    ));
    const lighthouseMetrics = Object.assign({}, ...scores);
    return { metrics: lighthouseMetrics, report: { [url]: htmlReport } };
  } catch (err) {
    throw err;
  }
};


module.exports = {
  metricsToSvg,
  htmlReportsToFile,
  getLighthouseMetrics,
};