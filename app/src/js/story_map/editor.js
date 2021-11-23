import {sendData,path} from './../mx_helper_misc.js';
import {getApiUrl} from './../mx_helper_map.js';
import {modal} from './../mx_helper_modal.js';

const customStyle = [
  /* Table classes from bootstrap */
  {t: 'Table base', c: 'table', f: ['table']},
  {t: 'Table bordered', c: 'table-bordered', f: ['table']},
  {t: 'Table striped', c: 'table-striped', f: ['table']},
  {t: 'Table hover', c: 'table-hover', f: ['table']},
  /* custom mapx classes */
  {t: 'Image cover', c: 'mx-image-cover', f: ['img']},
  {t: 'Margin top 5%', c: 'margin-top-5p'},
  {t: 'Width 100%', c: 'width-100p'},
  {t: 'Margin right 5%', c: 'margin-right-5p'},
  {t: 'Margin left 5%', c: 'margin-left-5p'},
  {t: 'Margin bottom 5%', c: 'margin-bottom-5p'},
  {t: 'Margin top 10%', c: 'margin-top-10p'},
  {t: 'Margin right 10%', c: 'margin-right-10p'},
  {t: 'Margin left 10%', c: 'margin-left-10p'},
  {t: 'Margin bottom 10%', c: 'margin-bottom-10p'},
  {t: 'Align right', c: 'align-right'},
  {t: 'Align left', c: 'align-left'},
  {t: 'Center', c: 'block-center'},
  {t: 'Absolute top', c: 'absolute-top'},
  {t: 'Absolute left', c: 'absolute-left'},
  {t: 'Absolute right', c: 'absolute-right'},
  {t: 'Absolute bottom', c: 'absolute-bottom'},
  {t: 'Absolute 50% top', c: 'absolute-50-top'},
  {t: 'Absolute 50% left', c: 'absolute-50-left'},
  {t: 'Absolute 50% right', c: 'absolute-50-right'},
  {t: 'Absolute 50% bottom', c: 'absolute-50-bottom'}
];

/**
 * Init editing function
 * @param {Object} sate Story state
 */
export async function initEditing(state) {

  if(state._init_editing){
     return;
  }
  state._init_editing = true;


  const m = await Promise.all([
    import('ContentTools'),
    import('ContentTools/build/content-tools.min.css')
  ]);
  const ContentTools = m[0].default;
  await import('./coffee/mx_extend_content_tools.coffee');

  /*
   * Get ContentTools and set upload logic
   */

  if (!ContentTools._init) {
    ContentTools.DEFAULT_TOOLS = [
      ['h1', 'h2', 'h3', 'h4', 'h5', 'paragraph', 'blockquote', 'preformatted'],
      ['italic', 'bold'],
      ['align-left', 'align-center', 'align-right'],
      [
        'unordered-list',
        'ordered-list',
        'table',
        'indent',
        'unindent',
        'line-break'
      ],
      ['link', 'image', 'video'],
      ['undo', 'redo', 'remove']
    ];

    const style = customStyle.map(function(s) {
      return new ContentTools.Style(s.t, s.c, s.f);
    });
    ContentTools.StylePalette.add(style);
    ContentTools.IMAGE_UPLOADER = contentToolsImageUploader;
    ContentTools._init = true;
  }
  /**
   * If not already set, create a new editor instance
   */
  if (!state.ct_editor) {
    state.ct_editor = ContentTools.EditorApp.get();

    /**
     * Add custom button logic
     */
    const elBtnModalPreview = document.getElementById('btnViewPreviewStory');
    const elBtnModalSave = document.getElementById('btnViewSaveStory');
    const elModalEditView = document.getElementById('modalViewEdit');
    /**
     * Set a remove function for custom buttons
     */
    state.ct_editor_remove = ()=>{
      state.ct_editor.destroy();
    };

    /**
     * Init editor
     */
    state.ct_editor.init(
      '*[data-editable]', // class of region editable
      'data-name', // name of regions
      null, // fixture test
      true
    );

    /**
     * On start
     */
    state.ct_editor.addEventListener('start', ()=>{
      elBtnModalSave.setAttribute('disabled', true);
      elBtnModalPreview.setAttribute('disabled', true);
      //elBtnStoryClose.setAttribute("disabled",true);
      elModalEditView.classList.add('mx-hide');
      /* If jed has an story editor, disable it during edition */
      if (jed.editors.storyEdit) {
        jed.editors.storyEdit.disable();
      }
    });

    /**
     * On cancel
     */
    state.ct_editor.addEventListener('revert', ()=>{
      elBtnModalSave.removeAttribute('disabled');
      elBtnModalPreview.removeAttribute('disabled');
      elModalEditView.classList.remove('mx-hide');
      //elBtnStoryClose.removeAttribute("disabled");
      if (jed.editors.storyEdit) {
        jed.editors.storyEdit.enable();
      }
    });

    /**
     * On save
     */
    state.ct_editor.addEventListener('saved',function(ev){
      elBtnModalSave.removeAttribute('disabled');
      elBtnModalPreview.removeAttribute('disabled');
      elModalEditView.classList.remove('mx-hide');
      // Check that something changed
      const regions = ev.detail().regions;
      if (jed.editors.storyEdit) {
        jed.editors.storyEdit.enable();
      }
      if (Object.keys(regions).length === 0) {
        return;
      }

      if (jed.editors.storyEdit) {
        const j = jed.editors.storyEdit;
        this.busy(true);

        for (var k in regions) {
          const t = regions[k];
          const s = k.split(':');
          const step = +s[0];
          const slide = +s[1];
          const lang = mx.settings.language;
          const e = j.getEditor(
            'root.steps.' + step + '.slides.' + slide + '.html.' + lang
          );
          if (e && e.setValue) {
            e.setValue(t);
          }
        }
        this.busy(false);
      }
    });
  }
}

function contentToolsImageUploader(dialog) {
  let image, url, xhr, height, width, type;

  /**
   * Cancel upload
   */
  dialog.addEventListener('imageuploader.cancelupload', function() {
    if (xhr) {
      xhr.upload.removeEventListener('progress', xhrProgress);
      xhr.removeEventListener('readystatechange', xhrComplete);
      xhr.abort();
    }

    dialog.state('empty');
  });

  /**
   * Clear image
   */
  dialog.addEventListener('imageuploader.clear', function() {
    // Clear the current image
    dialog.clear();
    image = null;
  });

  /**
   * File is loaded
   */
  dialog.addEventListener('imageuploader.fileready', function(ev) {
    const fileReader = new FileReader();
    const file = ev.detail().file;
    type = file.type;
    image = new Image();
    fileReader.readAsDataURL(file);
    fileReader.addEventListener('load', function(e) {
      url = e.target.result;
      image.src = url;
      image.onload = function() {
        width = this.width;
        height = this.height;
        setMaxWidth(1200, function(url, width, height) {
          dialog.populate(url, [width, height]);
        });
      };
    });
  });

  /**
   * Insert image
   */
  dialog.addEventListener('imageuploader.save', function() {
    if (path(mx, 'settings.user.guest')) {
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.height = height;
    canvas.width = width;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    ctx.save();
    canvas.toBlob(
      function(blob) {
        const form = new FormData();
        form.append('image', blob);
        form.append('width', width);
        form.append('height', height);
        form.append('token', path(mx, 'settings.user.token'));
        form.append('idUser', path(mx, 'settings.user.id'));
        form.append('project', path(mx, 'settings.project.id'));

        sendData({
          url: getApiUrl('uploadImage'),
          data: form,
          onProgress: function(progress) {
            dialog.progress(progress * 100);
          },
          onSuccess: function(data) {
            data = data.split('\t\n');
            data.forEach((d) => {
              try {
                d = JSON.parse(d);
              } catch (err) {}
              if (d.msg && d.msg.url && d.msg.size) {
                dialog.save(d.msg.url, d.msg.size, {
                  alt: 'img',
                  'data-ce-max-width': d.msg.size[0]
                });
              } else {
                console.log(d);
              }
            });
          },
          onError: function(er) {
          modal({
              title: 'Error during the upload',
              content: 'An error occured during the upload : ' + er,
              styleString: 'z-index:11000'
            });
          }
        });

        // Set the dialog state to uploading and reset the progress bar to 0
        dialog.state('uploading');
        dialog.progress(0);
      },
      type || 'image/jpeg',
      0.95
    );
  });

  dialog.addEventListener('imageuploader.rotateccw', function() {
    dialog.busy(true);
    rotateImage(-90);
    dialog.busy(false);
  });

  dialog.addEventListener('imageuploader.rotatecw', function() {
    dialog.busy(true);
    rotateImage(90);
    dialog.busy(false);
  });

  function setMaxWidth(maxWidth, onLoad) {
    const ratio = height / width;

    if (width <= maxWidth) {
      onLoad(url, width, height);
    } else {
      const newWidth = maxWidth;
      const newHeight = newWidth * ratio;
      const canvas = document.createElement('canvas');
      canvas.height = newHeight;
      canvas.width = newWidth;
      const ctx = canvas.getContext('2d');
      ctx.save();
      ctx.drawImage(image, 0, 0, width, height, 0, 0, newWidth, newHeight);
      ctx.restore();
      const url = canvas.toDataURL();
      image.src = url;
      image.onload = function() {
        width = this.width;
        height = this.height;
        onLoad(url, width, height);
      };
    }
  }

  function rotateImage(degrees) {
    //const angle, canvas, ctx, to_radians, x, y, origWidth, origHeight;
    const angle = degrees % 360;
    const to_radians = Math.PI / 180;
    const canvas = document.createElement('canvas');

    const origWidth = width;
    const origHeight = height;
    if (angle === 90 || angle === -270 || angle === 270 || angle === -90) {
      width = origHeight;
      height = origWidth;
      x = width / 2;
      y = height / 2;
    } else if (angle === 180) {
      width = origWidth;
      height = origHeight;
      x = width / 2;
      y = height / 2;
    } else {
      width = Math.sqrt(Math.pow(origWidth, 2) + Math.pow(origHeight, 2));
      height = width;
      x = origHeight / 2;
      y = origWidth / 2;
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle * to_radians);
    ctx.drawImage(image, -origWidth / 2, -origHeight / 2);
    ctx.restore();

    const url = canvas.toDataURL();
    image.src = url;

    image.onload = function() {
      width = this.width;
      height = this.height;
      dialog.populate(url, [width, height]);
    };
  }
}
