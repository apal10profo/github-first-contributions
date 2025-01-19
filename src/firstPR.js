const fetch = require('node-fetch');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

class FirstPR {
    constructor(pr) {
        this.data = pr;
        this.first = null;
    }

    async getHoverCardURL() {
        try {
            // Get full PR HTML page
            const response = await fetch(this.data.html_url, {
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;',
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.14; rv:75.0) Gecko/20100101 Firefox/75.0',
                    'Host': 'github.com',
                },
            });
            const htmlPr = await response.text();
            const dom = new JSDOM(htmlPr);
            const document = dom.window.document;

            // Get the hovercard PR subject ID
            const subjectTagElm = document.querySelector('meta[name="hovercard-subject-tag"]');
            if (!subjectTagElm) return null;
            const subjectTag = subjectTagElm.getAttribute('content');

            // Get the base hovercard URL
            const urlElm = document.querySelector('.pull-discussion-timeline .js-comment-container:first-of-type a.author');
            if (!urlElm) return null;
            const url = urlElm.getAttribute('data-hovercard-url');

            // dependabot doesn't have a hovercard
            if (!url) return null;

            // Construct full URL
            return `https://github.com${url}` +
                `?subject=${encodeURIComponent(subjectTag)}` +
                `&current_path=${encodeURIComponent(this.data.html_url.replace('https://github.com', ''))}`;
        } catch (error) {
            console.error('Error fetching hovercard URL:', error);
            return null;
        }
    }

    async getContribState() {
        try {
            // Abort if author is member
            if (this.data.author_association === 'MEMBER') return this.first = null;

            // Get the hovercard URL
            const hovercardUrl = await this.getHoverCardURL();
            if (!hovercardUrl) return this.first = null;

            // Fetch the hovercard HTML
            const response = await fetch(hovercardUrl, {
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;',
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.14; rv:75.0) Gecko/20100101 Firefox/75.0',
                    'Host': 'github.com',
                    'Referer': this.data.html_url,
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            const hovercardHtml = await response.text();

            // Get opened PR line & return
            const found = hovercardHtml.match(/Opened this pull request ?\(?(.*?)\)?\s<\/span>/);
            if (found && found[1]) return this.first = found[1];
            return this.first = null;
        } catch (error) {
            console.error('Error fetching contribution state:', error);
            return this.first = null;
        }
    }
}

module.exports = FirstPR;
