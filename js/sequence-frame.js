/**
 * SequenceFrame 1.0.3
 */
(function () {
    this.SequenceFrame = function (options) {
        // 默认值
        let defaults = {
            trigger: '#sequence-trigger', // String | HTML Element - 屏幕顶端触碰该元素时触发序列帧
            wrapper: '#sequence-wrapper', // String | HTML Element - 画布的外层，用来控制画布的大小
            canvas: '#sequence-canvas', // String | HTML Element - 画布元素，序列帧部分
            path: 'images/sequence/', // String - 序列帧路径
            frames: 90, // Number - 序列帧图片数量
            format: '.jpg', // String - 序列帧图片格式
            portraitSuffix: '-xs', // String - 移动端序列帧后缀
            webp: false, // Boolean - 是否使用 WebP 格式文件
            fit: 'cover', // String - 包含 cover 和 contain 两种。描述：序列帧呈现形式
            ease: 0.2, // Number - 0 ~ 1。缓动效果，数值越小缓动越强
            duration: '100%', // String - 百分数。序列帧滚动的高度，100% = 100vh
            triggerHook: 0, // Number - 0 ~ 1。控制屏幕顶端触碰该元素时触发序列帧的位置
            addIndicators: false, // Boolean - 触发指示器
            pauseTrigger: '.sequence-pause-trigger', // String - 屏幕顶端触碰该元素时触发序列帧
            pauseFrame: [], // [Number] - 第 X 帧暂停，需要与 pausingFrames 搭配使用
            pausingFrames: [], // [Number] - 暂停的帧数，需要与 pauseFrame 搭配使用
            isPortrait: function () {
                return window.matchMedia('(max-aspect-ratio: 11/10)').matches; // Function - 媒体查询，电脑端和移动端分别调用对应图片
            }
        };

        // 通过使用传入的参数扩展默认值来创建选项
        options = (arguments[0] && typeof arguments[0] === 'object') ? extendDefaults(defaults, arguments[0]) : defaults;

        // init
        const
            self = this,
            html = document.documentElement;

        // scroller
        this.scroller = {
            ease: parseFloat(options.ease),
            endY: 0,
            y: 0,
            resizeRequest: 1,
            scrollRequest: 0,
            requestId: null
        };

        // support
        this.support = {
            webp: false,
            sticky: false,
        };

        // detect sticky
        if (!!(window.CSS && window.CSS.supports || window.supportsCSS || false)) {
            if (CSS.supports('position', 'sticky')) {
                self.support.sticky = true;
            }
        }

        // screen data
        this.screenWidth = html.clientWidth;
        this.screenHeight = html.clientHeight;
        this.isPortrait = options.isPortrait();
        this.isPortraitFlag = this.isPortrait;
        this.resizeTimeOut = null;

        // options
        options.trigger = getOption(options.trigger);
        options.wrapper = getOption(options.wrapper);
        options.canvas = getOption(options.canvas);
        options.pauseTrigger = document.querySelectorAll(options.pauseTrigger);
        options.duration = parseFloat(options.duration) / 100;
        options.triggerHook = parseFloat(options.triggerHook);

        // canvas
        this.ctx = options.canvas.getContext('2d');
        this.images = [];
        this.index = 0;

        this.triggerHook = options.triggerHook * this.screenHeight;
        this.start = options.trigger.getBoundingClientRect().top + window.pageYOffset - this.triggerHook;
        this.end = options.duration * this.screenHeight;
        this.hasPauseTrigger = options.pauseTrigger.length;
        this.indexFrames = parseFloat(options.frames) - 1;
        this.pausePoint = options.pauseFrame.length;

        if (this.pausePoint) {
            this.newPauseFrame = [];
            this.newPauseFrame.push(options.pauseFrame[0]);
            options.pauseFrame.push(parseFloat(options.frames));
            this.newFrames = parseFloat(options.frames);

            for (let i = 0; i < this.pausePoint; i++) {
                this.newFrames += options.pausingFrames[i];
            }

            this.pauseDuration = [];
            this.pauseEndFrame = [];
            this.pauseEndDuration = [];
            this.pauseBetweenFrame = [];
            this.perFrameDuration = self.end / this.newFrames;

            const getPausingFrames = function (n) {
                let frames = 0;
                for (let i = 0; i <= n; i++) {
                    frames += options.pausingFrames[i];
                }
                return frames;
            };

            for (let i = 0; i < self.pausePoint; i++) {
                let n = i + 1;
                self.newPauseFrame.push(options.pauseFrame[n] + getPausingFrames(i));
                self.pauseDuration[i] = self.newPauseFrame[i] * self.perFrameDuration;
                self.pauseEndFrame[i] = self.newPauseFrame[i] + options.pausingFrames[i];
                self.pauseEndDuration[i] = self.pauseEndFrame[i] * self.perFrameDuration;

                if (n < self.pausePoint + 1) {
                    self.pauseBetweenFrame[i] = options.pauseFrame[n] - options.pauseFrame[i];
                }
                // set all pauseTriggers top position and duration
                if (this.hasPauseTrigger) {
                    options.pauseTrigger[i].style.top = parseFloat(self.pauseDuration[i]) + 'px';
                    options.pauseTrigger[i].setAttribute('data-duration', parseFloat(self.pauseEndDuration[i] - self.pauseDuration[i]) + 'px');
                }
            }
            // set sequenceFrame End top position
            if (this.hasPauseTrigger) {
                options.pauseTrigger[self.pausePoint].style.top = parseFloat(self.end) + 'px';
            }
        }

        function initImages() {
            // init data
            self.screenWidth = html.clientWidth;
            self.screenHeight = html.clientHeight;
            self.isPortrait = options.isPortrait();
            self.triggerHook = options.triggerHook * self.screenHeight;
            self.start = options.trigger.getBoundingClientRect().top + window.pageYOffset - self.triggerHook;
            self.end = options.duration * self.screenHeight;
            self.images = [];

            let width = options.wrapper.clientWidth,
                height = options.wrapper.clientHeight,
                scale = window.devicePixelRatio,
                suffix = self.isPortrait ? options.portraitSuffix : '',
                format = options.webp && self.support.webp ? '.webp' : options.format;

            // setup canvas size
            if (self.isPortrait) {
                // options.canvas.width = Math.round(width * scale);
                // options.canvas.height = Math.round(height * scale);
                options.canvas.width = width * 3;
                options.canvas.height = height * 3;
            } else if (scale > 1.5 || self.screenWidth > 2560) {
                options.canvas.width = width * 2;
                options.canvas.height = height * 2;
            } else {
                options.canvas.width = width;
                options.canvas.height = height;
            }

            // setup images, start name from 0001.format
            for (let i = 1; i <= parseFloat(options.frames); i++) {
                let image = new Image(),
                    slug = ('000' + i).slice(-4);

                image.src = options.path + slug + suffix + format;
                self.images.push(image);
            }

            self.images[0].onload = function () {
                // get data
                self.sx = 0;
                self.sy = 0;
                self.sWidth = self.images[0].width;
                self.sHeight = self.images[0].height;
                self.dx = 0;
                self.dy = 0;
                self.dWidth = self.ctx.canvas.width;
                self.dHeight = self.ctx.canvas.height;
                self.sRatio = self.sWidth / self.sHeight;
                self.dRatio = self.dWidth / self.dHeight;

                if (options.fit == 'cover') {
                    if (self.dRatio > self.sRatio) {
                        // missing width
                        self.sy = (self.sHeight - self.sWidth / self.dRatio) / 2;
                        self.sHeight = self.sWidth / self.dRatio;
                    } else {
                        // missing height
                        self.sx = (self.sWidth - self.sHeight * self.dRatio) / 2;
                        self.sWidth = self.sHeight * self.dRatio;
                    }
                } else if (options.fit == 'contain') {
                    if (self.dRatio > self.sRatio) {
                        // missing width
                        self.dx = (self.dWidth - self.dHeight * self.sRatio) / 2;
                        self.dWidth = self.dHeight * self.sRatio;
                    } else {
                        // missing height
                        self.dy = (self.dHeight - self.dWidth / self.sRatio) / 2;
                        self.dHeight = self.dWidth / self.sRatio;
                    }
                }

                // draw first image
                self.ctx.drawImage(self.images[0], self.sx, self.sy, self.sWidth, self.sHeight, self.dx, self.dy, self.dWidth, self.dHeight);
            };

            // setup indicators
            if (options.addIndicators) {
                indicators.update();
            }
        }

        function loadImages() {
            const webP = new Image();
            webP.src = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';
            webP.onload = webP.onerror = function () {
                if (webP.width == 1) {
                    self.support.webp = true;
                    initImages();
                } else {
                    initImages();
                }
            };
        }

        function drawSequenceFrame() {
            let imageL = self.images.length;
            if (imageL < 1) {
                initImages();
            }
            self.start = options.trigger.getBoundingClientRect().top + window.pageYOffset - self.triggerHook;
            // draw the first image
            if (self.scroller.y <= self.start) {
                self.index = 0;
            }
            // drawing
            if (!self.pausePoint) {
                if (self.scroller.y > self.start && self.scroller.y < self.start + self.end) {
                    self.index = Math.floor((self.scroller.y - self.start) / self.end * (parseFloat(options.frames) - 1));
                }
            } else { // have pausePoint
                if (self.pausePoint > 0) {
                    // drawing before pausePoint 1
                    if (self.scroller.y > self.start && self.scroller.y < self.start + self.pauseDuration[0]) {
                        self.index = Math.floor((self.scroller.y - self.start) / self.pauseDuration[0] * self.newPauseFrame[0]);
                    }
                    // pause at pausePoint 1
                    if (self.scroller.y >= self.start + self.pauseDuration[0] && self.scroller.y < self.start + self.pauseEndDuration[0]) {
                        self.index = options.pauseFrame[0];
                    }
                    // drawing after pausePoint 1 & only 1 pausePoint
                    if (self.pausePoint === 1) {
                        if (self.scroller.y >= self.start + self.pauseEndDuration[0] && self.scroller.y < self.start + self.end) {
                            self.index = options.pauseFrame[0] + Math.floor((self.scroller.y - self.start - self.pauseEndDuration[0]) / (self.end - self.pauseEndDuration[0]) * self.pauseBetweenFrame[0]);
                        }
                    }
                }
                if (self.pausePoint > 1) {
                    // drawing before pausePoint 2
                    if (self.scroller.y >= self.start + self.pauseEndDuration[0] && self.scroller.y < self.start + self.pauseDuration[1]) {
                        self.index = options.pauseFrame[0] + Math.floor((self.scroller.y - self.start - self.pauseEndDuration[0]) / (self.pauseDuration[1] - self.pauseEndDuration[0]) * self.pauseBetweenFrame[0]);
                    }
                    // pause at pausePoint 2
                    if (self.scroller.y >= self.start + self.pauseDuration[1] && self.scroller.y < self.start + self.pauseEndDuration[1]) {
                        self.index = options.pauseFrame[1];
                    }
                    // drawing after pausePoint 2 & Only 2 pausePoint
                    if (self.pausePoint === 2) {
                        if (self.scroller.y >= self.start + self.pauseEndDuration[1] && self.scroller.y < self.start + self.end) {
                            self.index = options.pauseFrame[1] + Math.floor((self.scroller.y - self.start - self.pauseEndDuration[1]) / (self.end - self.pauseEndDuration[1]) * self.pauseBetweenFrame[1]);
                        }
                    }
                }
                if (self.pausePoint > 2) {
                    // drawing before pausePoint 3
                    if (self.scroller.y >= self.start + self.pauseEndDuration[1] && self.scroller.y < self.start + self.pauseDuration[2]) {
                        self.index = options.pauseFrame[1] + Math.floor((self.scroller.y - self.start - self.pauseEndDuration[1]) / (self.pauseDuration[2] - self.pauseEndDuration[1]) * self.pauseBetweenFrame[1]);
                    }
                    // pause at pausePoint 3
                    if (self.scroller.y >= self.start + self.pauseDuration[2] && self.scroller.y < self.start + self.pauseEndDuration[2]) {
                        self.index = options.pauseFrame[2];
                    }
                    // drawing after pausePoint 3 & max 3 pausePoint
                    if (self.scroller.y >= self.start + self.pauseEndDuration[2] && self.scroller.y < self.start + self.end) {
                        self.index = options.pauseFrame[2] + Math.floor((self.scroller.y - self.start - self.pauseEndDuration[2]) / (self.end - self.pauseEndDuration[2]) * self.pauseBetweenFrame[2]);
                    }
                }
            }
            // draw the last image
            if (self.scroller.y >= self.start + self.end) {
                self.index = self.indexFrames;
            }
            // console.info('self.pausePoint', self.pausePoint, 'self.index', self.index, 'self.scroller.y', self.scroller.y, 'self.start', self.start);

            // canvas draw image
            self.ctx.globalCompositeOperation = 'copy';
            self.ctx.drawImage(self.images[self.index], self.sx, self.sy, self.sWidth, self.sHeight, self.dx, self.dy, self.dWidth, self.dHeight);
        }

        function updateScroller() {
            let resized = self.scroller.resizeRequest > 0,
                scrollY = window.pageYOffset || html.scrollTop || document.body.scrollTop || 0;

            if (resized) {
                self.scroller.resizeRequest = 0;
            }

            self.scroller.endY = scrollY;
            self.scroller.y += (scrollY - self.scroller.y) * self.scroller.ease;

            if (Math.abs(scrollY - self.scroller.y) < 0.1 || resized) {
                // console.info('catch up');
                self.scroller.y = scrollY;
                self.scroller.scrollRequest = 0;
            }

            drawSequenceFrame();

            self.scroller.requestId = self.scroller.scrollRequest > 0 ? requestAnimationFrame(updateScroller) : null;
            // console.info('resized', resized, 'self.scroller.resizeRequest',self.scroller.resizeRequest,'self.scroller.requestId',self.scroller.requestId);
        }

        function onScroll() {
            self.scroller.scrollRequest++;

            if (!self.scroller.requestId) {
                self.scroller.requestId = requestAnimationFrame(updateScroller);
            }
        }

        const indicators = {
            add: function () {
                // create indicators wrapper
                const indicatorsWrapper = document.createElement('div');
                indicatorsWrapper.setAttribute('id', 'sequence-frame-indicators');

                // triggerHook
                indicatorsWrapper.innerHTML += '<div style="position: fixed; z-index: 9999; top: ' + self.triggerHook + 'px; left: 0; overflow: visible; font-size: 0.85em; white-space: nowrap; pointer-events: none;"><div style="position: absolute; left: 0; overflow: visible; color: blue; border-top: 1px solid blue;"><div style="position: relative; padding: 0px 8px 3px;' + (options.triggerHook > 0.1 ? ' transform: translateY(-100%)' : '') + '">sequence frame trigger</div></div></div>';

                // range - start to end
                indicatorsWrapper.innerHTML += '<div class="sfi-range" style="position: absolute; z-index: 9999; top: ' + (self.start + self.triggerHook) + 'px; left: 0; height: ' + self.end + 'px; overflow: visible; font-size: 0.85em; white-space: nowrap; pointer-events: none;"><div style="position: absolute; overflow: visible; width: 0; height: 0;"><div style="position: absolute; bottom: -1px; overflow: visible; padding: 0px 8px; color: green; border-bottom: 1px solid green;">sequence frame start</div></div><div style="position: absolute; top: 100%; overflow: visible; padding: 0px 8px; color: red; border-top: 1px solid red;">sequence frame end</div></div>';

                // range - pausePoints
                for (let i = 0; i < self.pausePoint; i++) {
                    const n = i + 1;
                    indicatorsWrapper.innerHTML += '<div class="sfi-pause-point-' + n + '" style="position: absolute; z-index: 9999; top: ' + (self.start + self.pauseDuration[i] + self.triggerHook) + 'px; left: 0; height: ' + (self.pauseEndDuration[i] - self.pauseDuration[i]) + 'px; overflow: visible; font-size: 0.85em; white-space: nowrap; pointer-events: none;"><div style="position: absolute; overflow: visible; width: 0; height: 0;"><div style="position: absolute; bottom: -1px; overflow: visible; padding: 0px 8px; color: green; border-bottom: 1px solid green;">pause point start ' + n + '</div></div><div style="position: absolute; top: 100%; overflow: visible; padding: 0px 8px; color: red; border-top: 1px solid red;">pause point end ' + n + '</div></div>';
                }

                // append to body
                document.body.appendChild(indicatorsWrapper);
            },
            update: function () {
                // update range - start to end
                const range = document.querySelector('.sfi-range') || null;
                if (range) {
                    range.style.top = self.start + self.triggerHook + 'px';
                    range.style.height = self.end + 'px';
                }
                // update range - pausePoints
                for (let i = 0; i < self.pausePoint; i++) {
                    const pausePoint = document.querySelector('.sfi-pause-point-' + (i + 1)) || null;
                    if (pausePoint) {
                        pausePoint.style.top = self.start + self.pauseDuration[i] + self.triggerHook + 'px';
                        pausePoint.style.height = self.pauseEndDuration[i] - self.pauseDuration[i] + 'px';
                    }
                }
            }
        };

        // Init
        if (self.support.sticky) {
            loadImages();

            if (options.addIndicators) {
                indicators.add();
            }

            window.addEventListener('scroll', function () {
                requestAnimationFrame(onScroll);
            });

            window.addEventListener('resize', function () {
                            if (this.isPortrait !== this.isPortraitFlag) {
                                console.info('View Changed: Portrait | Landscape');
                                this.isPortraitFlag = this.isPortrait;
             
                                clearTimeout(self.resizeTimeOut);
                                self.resizeTimeOut = setTimeout(function () {
                                    loadImages();
                                    requestAnimationFrame(onScroll);
                                }, 200);
                            }
                        });
        } else {
            html.classList.add('no-sequence-frame');
        }
    };


    function getOption(option) {
        if (typeof option == 'string') {
            return document.getElementById(option) || document.querySelectorAll(option)[0];
        } else {
            return option;
        }
    }
    // 使用用户选项扩展默认值
    function extendDefaults(source, properties) {
        for (let property in properties) {
            if (properties.hasOwnProperty(property)) {
                source[property] = properties[property];
            }
        }
        return source;
    }
}());