import React from 'react';
import ReactDOM from 'react-dom';
const copy = require('copy-to-clipboard');
const yaml = require('js-yaml');

import './scss/styles.scss';
import util from './dom-util';
import {
  propertiedTranslation,
  cutTranslation,
  imageTranslation,
  translationFile,
  Translation
} from './translation';
import { noticeOption, Notice } from './elements/notice';
import {
  translationOption,
  Translation as TranslationElement
} from './elements/translation';
import { Configuration } from './widgets/configuration';
import { HotLinks } from './widgets/hot-links';

const tlsPath = '/translations' + location.pathname.replace('.html', '.yaml');
const githubUrl = `https://raw.githubusercontent.com/aquaclara/hrmy-translate/main/${tlsPath}`;
const localUrl = chrome.runtime.getURL(tlsPath);
let options: {
  fontSize: number;
  developmentMode: boolean;
};
const editableMode = true;
let data: translationFile;
const imageDenyList = ['hm001_030/horimiya_01.gif'];

function log(message: any, ...optionalParams: any[]) {
  if (options.developmentMode) {
    console.log(message, ...optionalParams);
  }
}

function main() {
  chrome.storage.sync.get(
    {
      fontSize: 5,
      developmentMode: false
    },
    function(items) {
      options = {
        fontSize: items.fontSize,
        developmentMode: items.developmentMode
      };
      log('Options loaded');
      log(items);
    }
  );

  // Try fetching translations from Github
  const xhr = new XMLHttpRequest();
  xhr.open('GET', githubUrl, true);
  xhr.onreadystatechange = () => {
    if (xhr.readyState != 4) return;
    const res: string = xhr.responseText;
    if (
      !options.developmentMode &&
      res &&
      res != 'null' &&
      res != '404: Not Found'
    ) {
      handleResponse(res);
    } else {
      log('File does not exist on Github. Try reading translations from local');
      const xhr = new XMLHttpRequest();
      xhr.open('GET', localUrl, true);
      xhr.onreadystatechange = () => {
        if (xhr.readyState != 4) return;
        const res = xhr.responseText;
        if (
          options.developmentMode ||
          (res && res != 'null' && res != '404: Not Found')
        ) {
          handleResponse(res);
        } else {
          log(`File does not exist for '${tlsPath}'`);
        }
      };
      xhr.send();
    }
  };
  xhr.send();
}

function handleResponse(response: string) {
  data = yaml.load(response);
  renderTranslations();
  appendHotLinks();
}

function getYaml(): string {
  const yamlText = yaml.dump(data, {
    noArrayIndent: true,
    sortKeys: true,
    noCompatMode: true
  });
  return yamlText + '\n';
}

function appendHotLinks() {
  ReactDOM.render(
    <HotLinks
      tlsPath={tlsPath}
      editableMode={options.developmentMode}
      onClickConfigure={onClickConfigure}
      onClickCopy={(event: React.MouseEvent<HTMLAnchorElement>) => {
        copy(getYaml());
      }}
      onClickSave={(event: React.MouseEvent<HTMLAnchorElement>) => {
        log('The save button clicked');
        const filename = tlsPath.replace(/^.*[\\\/]/, '');
        chrome.runtime.sendMessage({
          url: URL.createObjectURL(
            new Blob([getYaml()], {
              type: 'text/yaml'
            })
          ),
          filename: filename
        });
      }}
    />,
    util.getBodyElement().appendChild(document.createElement('div'))
  );
}

function renderTranslations(focus?: [string, number, number]) {
  for (const img of document.querySelectorAll(
    'img, td[background]'
  ) as NodeListOf<HTMLImageElement | HTMLTableCellElement>) {
    const imageId = util.getImageId(img);

    if (imageDenyList.indexOf(imageId) >= 0) {
      continue;
    }
    if (
      !data ||
      data[imageId] === null ||
      data[imageId] === undefined ||
      data[imageId].length === 0
    ) {
      const opt: noticeOption = {
        message: '(제공된 번역이 아직 없습니다)' + `<!--${imageId}-->`,
        fontSize: options.fontSize,
        top: util.getProperty(img, 'offsetTop') + 'px',
        left:
          util.getProperty(img, 'offsetLeft') +
          util.getProperty(img, 'width') +
          'px',
        editableMode: options.developmentMode
      };
      if (options.developmentMode) {
        opt.onclick = (ev: Event): any => {
          console.log(`clicked ${imageId}`);
          removeTranslates();
          if (!data) {
            data = {};
          }
          data[imageId] = [['']];
          renderTranslations([imageId, 0, 0]);
        };
      }
      new Notice(opt).render();
    } else {
      const image: imageTranslation = data[imageId];
      for (let cutIndex = 0; cutIndex < image.length; cutIndex++) {
        const cut: cutTranslation = image[cutIndex];
        const $tlsGroup: HTMLDivElement = document.createElement('div');
        $tlsGroup.classList.add('translation-group', 'float');
        for (let tlsIndex = 0; tlsIndex < cut.length; tlsIndex++) {
          const opt: translationOption = {
            tag: 'p',
            parent: $tlsGroup,
            fontSize: options.fontSize,
            editableMode: options.developmentMode
          };
          if (options.developmentMode) {
            if (
              focus &&
              focus[0] === imageId &&
              focus[1] === cutIndex &&
              focus[2] === tlsIndex
            ) {
              opt.focus = true;
            }
            opt.oninput = (ev: Event): any => {
              if (ev.target instanceof HTMLInputElement) {
                const target = ev.target as HTMLInputElement;
                const changed = target.value;
                log(`changed: ${[imageId, cutIndex, tlsIndex]} to ${changed}`);

                target.size = TranslationElement.getPreferSize(changed.length);
                data[imageId][cutIndex][tlsIndex] = changed;
              }
            };
            opt.onkeydown = (ev: KeyboardEvent): any => {
              if (ev.target instanceof HTMLInputElement) {
                const target = ev.target as HTMLInputElement;
                const changed = target.value;
                log(target.parentElement.nextSibling);
                if (!ev.ctrlKey && ev.key === 'Enter') {
                  log(`Enter at ${[imageId, cutIndex, tlsIndex]}`);
                  data[imageId][cutIndex].splice(tlsIndex + 1, 0, '');
                  removeTranslates();
                  renderTranslations([imageId, cutIndex, tlsIndex + 1]);
                } else if (ev.ctrlKey && ev.key === 'Enter') {
                  log(`Ctrl+Enter at ${[imageId, cutIndex, tlsIndex]}`);
                  data[imageId].splice(cutIndex + 1, 0, ['']);
                  removeTranslates();
                  renderTranslations([imageId, cutIndex + 1, 0]);
                } else if (ev.key == 'Backspace' && changed.length === 0) {
                  log(`Backspace at ${[imageId, cutIndex, tlsIndex]}`);
                  removeTranslates();
                  if (data[imageId][cutIndex].length === 1) {
                    data[imageId].splice(cutIndex, 1);
                    renderTranslations([
                      imageId,
                      cutIndex - 1,
                      data[imageId][cutIndex - 1].length - 1
                    ]);
                  } else {
                    data[imageId][cutIndex].splice(tlsIndex, 1);
                    renderTranslations([imageId, cutIndex, tlsIndex - 1]);
                  }
                }
              }
            };
          }
          if (typeof cut[tlsIndex] === 'string') {
            const text = cut[tlsIndex];
            if (!editableMode && Translation.isComment(text)) {
              continue;
            }
            opt.message = text as string;
          } else {
            const translate = cut[tlsIndex] as propertiedTranslation;
            opt.message = translate['text'];
            opt.color = translate['color'];
            opt.marginLeft = translate['margin-left'];
          }
          new TranslationElement(opt).render();
        }
        $tlsGroup.style.top =
          util.getProperty(img, 'offsetTop') +
          (util.getProperty(img, 'height') / image.length) * cutIndex +
          'px';
        $tlsGroup.style.left =
          util.getProperty(img, 'offsetLeft') +
          util.getProperty(img, 'width') +
          'px';
        util.getBodyElement().appendChild($tlsGroup);
      }
    }
  }
}

function removeTranslates() {
  document
    .querySelectorAll('.caption, .translation-group')
    .forEach((e: Element) => {
      e.remove();
    });
}

function onClickConfigure(event: React.MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
  const mBrowser = typeof browser === 'undefined' ? chrome : browser;
  const version = mBrowser.runtime.getManifest().version;
  const $body = util.getBodyElement();
  const $overlay: HTMLDivElement = document.createElement('div');
  $body.appendChild($overlay);
  ReactDOM.render(
    <Configuration
      version={version}
      onClickOverlay={(event: React.MouseEvent<HTMLDivElement>) => {
        if (
          event.target instanceof Element &&
          event.target.classList.contains('overlay')
        ) {
          $body.removeChild($overlay);
        }
      }}
      defaultFontSize={options.fontSize}
      onChangeFontSize={(event: React.ChangeEvent<HTMLInputElement>) => {
        options.fontSize = parseInt(event.target.value);
        onChangeSettings();
      }}
      defaultDevelopmentMode={options.developmentMode}
      onChangeDevelopmentMode={(event: React.ChangeEvent<HTMLInputElement>) => {
        options.developmentMode = event.target.checked;
        onChangeSettings();
      }}
    />,
    $overlay
  );
}

function onChangeSettings() {
  chrome.storage.sync.set(options, function() {
    log('Options saved');
    log(options);
    // @todo Update status to let user know options were saved.
    // var status = document.getElementById('status');
    // status.textContent = 'Options saved.';
    // setTimeout(function() {
    //   status.textContent = '';
    // }, 750);
  });

  const captions: NodeListOf<HTMLElement> = document.querySelectorAll(
    '.caption'
  );
  for (const caption of captions) {
    caption.style.fontSize = `${options.fontSize}mm`;
  }
}

main();