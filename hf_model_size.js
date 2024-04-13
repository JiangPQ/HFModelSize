// ==UserScript==
// @name         HFModelSize
// @namespace    http://tampermonkey.net/
// @version      2024-04-12
// @description  Display model size for you on huggingface.
// @author       JiangPQ
// @match        https://huggingface.co/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=huggingface.co
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    let tabs = document.getElementsByClassName('tab-alternate');
    if (tabs.length === 0) return;
    if (tabs[0].textContent.trim() !== 'Model card') return;
    // now we are sure at a model card page.

    function formatFileSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const decimals = 2;

        if (bytes === 0) return '0 B';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + units[i];
    }

    function calculateModelSize(listPage) {
        const fileList = listPage.querySelector('div[data-target="ViewerIndexTreeList"]');
        const data = JSON.parse(fileList.getAttribute("data-props"));
        let sizeInBytes = 0;
        data.entries.forEach(entry => {
            sizeInBytes += entry.size;
        });
        return formatFileSize(sizeInBytes);
    }

    function updateSizeOnPage(listPage) {
        let size = calculateModelSize(listPage);
        const newText = document.createTextNode(size);
        const header_row = document.querySelector('div[data-target="ModelHeader"] > header > div > div');
        header_row.appendChild(newText);

        let observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.removedNodes.length > 0) {
                    for (let i = 0; i < mutation.removedNodes.length; i++) {
                        if (mutation.removedNodes[i] === newText) {
                            console.log('File size element was removed. Re-appending...');
                            header_row.appendChild(newText);
                        }
                    }
                }
            });
        });
        observer.observe(header_row, { childList: true });
    }

    function getFilePage(url) {
        return new Promise((resolve, reject) => {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url);

            xhr.onload = function() {
                if (xhr.status === 200) {
                    resolve(xhr.responseText);
                } else {
                    reject(new Error('Request failed. Status: ' + xhr.status));
                }
            };

            xhr.onerror = function() {
                reject(new Error('Request failed. Network error.'));
            };

            xhr.send();
        });
    }

    if (tabs[1].classList.contains('active')) {
        // current page is the file list page, calculate on current page directly
        updateSizeOnPage(document);
    }
    else {
        // otherwise get files page and update file size on current page.
        let filesPageHref = tabs[1].getAttribute('href');
        getFilePage(filesPageHref)
            .then(html => {
            let parser = new DOMParser();
            let filesPage = parser.parseFromString(html, 'text/html');
            updateSizeOnPage(filesPage);
        })
            .catch(error => {
            return;
        });
    }
})();
