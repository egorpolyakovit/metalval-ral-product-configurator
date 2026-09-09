(() => {
	'use strict';

	const popup = document.getElementById('lyukiRal');
	if (!popup) return;

	const config = window.lyukiRalConfig || {};
	const categories = Array.isArray(config.categories) ? config.categories : [];

	const openButtons = document.querySelectorAll('[data-lyuki-ral-open]');
	const closeButtons = popup.querySelectorAll('[data-lyuki-ral-close]');

	const categorySelect = document.getElementById('lyukiRalCategory');
    const categoryDisplay = document.getElementById('lyukiRalCategoryDisplay');
    const categorySelectWrap = categorySelect ? categorySelect.closest('.lyukiRal__selectWrap') : null;
	const sizeSelect = document.getElementById('lyukiRalSize');
	const viewButtons = Array.from(popup.querySelectorAll('.lyukiRal__viewButton[data-view]'));

	const productTitle = document.getElementById('lyukiRalProductTitle');
	const productSize = document.getElementById('lyukiRalProductSize');

	const viewerStage = document.getElementById('lyukiRalViewerStage');
	const image = document.getElementById('lyukiRalImage');
	const viewerPlaceholder = document.getElementById('lyukiRalViewerPlaceholder');

	const colorsWrap = document.getElementById('lyukiRalColors');
	const colorsCount = document.getElementById('lyukiRalColorsCount');
	const searchInput = document.getElementById('lyukiRalSearch');

	const selectedColor = document.getElementById('lyukiRalSelectedColor');
	const selectedSwatch = document.getElementById('lyukiRalSelectedSwatch');
	const selectedName = document.getElementById('lyukiRalSelectedName');
	const selectedCode = document.getElementById('lyukiRalSelectedCode');

	const slideshowButton = document.getElementById('lyukiRalSlideshow');
	const quoteButton = document.getElementById('lyukiRalQuote');
	const consultButton = document.getElementById('lyukiRalConsult');
    const saveImageButton = document.getElementById('lyukiRalSaveImage');

	if (!categorySelect || !sizeSelect || !viewerStage || !viewerPlaceholder || !colorsWrap || !colorsCount || !searchInput) {
		return;
	}

	let canvas = document.getElementById('lyukiRalCanvas');

	if (!canvas) {
		canvas = document.createElement('canvas');
		canvas.id = 'lyukiRalCanvas';
		canvas.className = 'lyukiRal__canvas';
		viewerStage.insertBefore(canvas, viewerStage.firstChild);
	}

	const ctx = canvas.getContext('2d', { willReadFrequently: true });

	if (image) {
		image.hidden = true;
		image.style.display = 'none';
	}

	const RAL_COLORS = [
        { code: 'RAL 1003', name: 'Сигнальный жёлтый', hex: '#F9A900' },
        { code: 'RAL 1023', name: 'Транспортный жёлтый', hex: '#FAD201' },

        { code: 'RAL 2004', name: 'Чистый оранжевый', hex: '#E25303' },

        { code: 'RAL 3000', name: 'Огненно-красный', hex: '#AF2B1E' },
        { code: 'RAL 3001', name: 'Сигнальный красный', hex: '#A52019' },
        { code: 'RAL 3020', name: 'Транспортный красный', hex: '#CC0605' },

        { code: 'RAL 5005', name: 'Сигнальный синий', hex: '#154889' },
        { code: 'RAL 5015', name: 'Небесно-синий', hex: '#2874B2' },
        { code: 'RAL 5017', name: 'Транспортный синий', hex: '#063971' },

        { code: 'RAL 6024', name: 'Транспортный зелёный', hex: '#19774f' },
        { code: 'RAL 6018', name: 'Жёлто-зелёный', hex: '#57A639' },

        { code: 'RAL 7016', name: 'Антрацитово-серый', hex: '#383E42' },
        { code: 'RAL 7024', name: 'Графитовый серый', hex: '#474A50' }
    ];

    const state = {
        categoryIndex: -1,
        item: null,
        view: '',
        ral: null,
        slideshowTimer: null,
        slideshowRunning: false,
        slideshowDuration: 5000,
        slideshowCountdownTimer: null,
        imageCache: new Map(),
        renderingToken: 0
    };

	function normalize(value) {
		return String(value ?? '').trim().toLowerCase();
	}

	function normalizeSize(value) {
		return String(value ?? '')
			.toLowerCase()
			.replace(/[×хx]/g, 'x')
			.replace(/мм/g, '')
			.replace(/\s+/g, '')
			.replace(/[^0-9x]/g, '');
	}

	function escapeHtml(value) {
		return String(value ?? '')
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
	}

    function updateCategoryDisplay() {
        if (!categoryDisplay || !categorySelect) return;

        const option = categorySelect.options[categorySelect.selectedIndex];

        categoryDisplay.textContent = option
            ? option.textContent
            : '';
    }

	function getCurrentCategory() {
		return state.categoryIndex >= 0 && categories[state.categoryIndex] ? categories[state.categoryIndex] : null;
	}

	function getCategoryItems() {
		const category = getCurrentCategory();
		return category && Array.isArray(category.items) ? category.items : [];
	}

	function getViews(item = state.item) {
		return item && item.views && typeof item.views === 'object' ? item.views : {};
	}

	function getAvailableViews(item = state.item) {
		const views = getViews(item);
		return ['front', 'side_a', 'top'].filter(view => {
            return typeof views[view] === 'string' && views[view].trim() !== '';
        });
	}

	function buildImageAlt() {
		const title = state.item?.item_name || 'Промышленный люк';
		const size = state.item?.size ? ` ${state.item.size}` : '';
		const ral = state.ral ? `, ${state.ral.code}` : '';
		return `${title}${size}${ral}`;
	}

    function populateCategories() {
        categorySelect.innerHTML = '<option value="">Выбрать категорию люков</option>';

        categories.forEach((category, index) => {
            const option = document.createElement('option');
            option.value = String(index);
            option.textContent = category.category || `Категория ${index + 1}`;
            categorySelect.appendChild(option);
        });

        updateCategoryDisplay();
    }

	function clearCanvas() {
		canvas.width = 1;
		canvas.height = 1;
		canvas.style.display = 'none';
		ctx.clearRect(0, 0, 1, 1);
	}

    let slideshowProgress = document.getElementById('lyukiRalSlideshowProgress');

    if (!slideshowProgress) {
        slideshowProgress = document.createElement('div');
        slideshowProgress.id = 'lyukiRalSlideshowProgress';
        slideshowProgress.className = 'lyukiRal__slideshowProgress';
        slideshowProgress.innerHTML = `
            <svg viewBox="0 0 40 40">
                <circle class="lyukiRal__slideshowTrack" cx="20" cy="20" r="17"></circle>
                <circle class="lyukiRal__slideshowCircle" cx="20" cy="20" r="17"></circle>
            </svg>
            <span class="lyukiRal__slideshowSeconds">5</span>
        `;

        viewerStage.appendChild(slideshowProgress);
    }

    const slideshowCircle = slideshowProgress.querySelector('.lyukiRal__slideshowCircle');
    const slideshowSeconds = slideshowProgress.querySelector('.lyukiRal__slideshowSeconds');

    function restartSlideshowProgress() {
        if (!slideshowProgress || !slideshowCircle || !slideshowSeconds) return;

        const seconds = state.slideshowDuration / 1000;

        slideshowSeconds.textContent = String(seconds);

        slideshowCircle.style.animation = 'none';
        slideshowProgress.offsetHeight;

        slideshowCircle.style.animation = `lyukiRalCountdown ${state.slideshowDuration}ms linear forwards`;

        let remaining = seconds;

        if (state.slideshowCountdownTimer) {
            clearInterval(state.slideshowCountdownTimer);
        }

        state.slideshowCountdownTimer = setInterval(() => {
            remaining--;

            if (remaining <= 0) {
                clearInterval(state.slideshowCountdownTimer);
                state.slideshowCountdownTimer = null;
                return;
            }

            slideshowSeconds.textContent = String(remaining);
        }, 1000);
    }

	function clearViewer() {
		stopSlideshow();
		state.item = null;
		state.view = '';

		clearCanvas();

		viewerPlaceholder.hidden = false;
		viewerPlaceholder.textContent = 'Выберите люк для просмотра';

        if (productTitle) {
            const category = getCurrentCategory();

            productTitle.textContent = category?.category
                ? `Вы выбрали категорию «${category.category}», далее выберите размер люка`
                : 'Выберите категорию и размер люка';
        }

        if (productSize) productSize.textContent = '';

		updateViewButtons();
		updateQuoteLink();
	}

	function populateSizes(selectedIndex = -1) {
		sizeSelect.innerHTML = '<option value="">Выбрать размер</option>';
		sizeSelect.disabled = true;
		state.item = null;

		const items = getCategoryItems();

		if (!items.length) {
			clearViewer();
			return;
		}

		items.forEach((item, index) => {
			const option = document.createElement('option');
			option.value = String(index);
			option.textContent = item.size || `Вариант ${index + 1}`;
			sizeSelect.appendChild(option);
		});

		sizeSelect.disabled = false;

		if (selectedIndex >= 0 && items[selectedIndex]) {
			sizeSelect.value = String(selectedIndex);
			state.item = items[selectedIndex];
			renderProduct();
		} else {
			clearViewer();
		}
	}

    function updateViewButtons() {
        const available = getAvailableViews();

        viewButtons.forEach(button => {
            const view = button.dataset.view;
            const enabled = available.includes(view);

            button.disabled = !enabled;
            button.classList.toggle('isActive', enabled && view === state.view);
        });

        if (slideshowButton) {
            slideshowButton.disabled = available.length < 2;
        }

        if (saveImageButton) {
            saveImageButton.disabled = !state.item || !state.view;
        }
    }

	function renderColors(filter = '') {
		const query = normalize(filter);

		const filtered = RAL_COLORS.filter(color => {
			return !query || normalize(`${color.code} ${color.name}`).includes(query);
		});

		colorsCount.textContent = String(filtered.length);
		colorsWrap.innerHTML = '';

		if (!filtered.length) {
			colorsWrap.innerHTML = '<div class="lyukiRal__empty">Цвет не найден</div>';
			return;
		}

		filtered.forEach(color => {
			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'lyukiRal__color';
			button.dataset.ral = color.code;

			if (state.ral?.code === color.code) {
				button.classList.add('isActive');
			}

			button.innerHTML = `
				<span class="lyukiRal__colorSwatch" style="background:${escapeHtml(color.hex)}"></span>
				<span class="lyukiRal__colorText">
					<span class="lyukiRal__colorName">${escapeHtml(color.name)}</span>
					<span class="lyukiRal__colorCode">${escapeHtml(color.code)}</span>
				</span>
			`;

			button.addEventListener('click', () => selectRal(color));
			colorsWrap.appendChild(button);
		});
	}

	function selectRal(color) {
		state.ral = color;

		if (selectedColor && selectedSwatch && selectedName && selectedCode) {
			selectedColor.hidden = false;
			selectedSwatch.style.background = color.hex;
			selectedName.textContent = color.name;
			selectedCode.textContent = color.code;
		}

		renderColors(searchInput.value);
		updateQuoteLink();
		renderCurrentView();
		dispatchSelectionChange();
	}

	function hexToRgb(hex) {
		const value = String(hex || '').replace('#', '').trim();
		if (!/^[0-9a-f]{6}$/i.test(value)) return null;

		return {
			r: parseInt(value.slice(0, 2), 16),
			g: parseInt(value.slice(2, 4), 16),
			b: parseInt(value.slice(4, 6), 16)
		};
	}

	function rgbToHsl(r, g, b) {
		r /= 255;
		g /= 255;
		b /= 255;

		const max = Math.max(r, g, b);
		const min = Math.min(r, g, b);
		let h = 0;
		let s = 0;
		const l = (max + min) / 2;

		if (max !== min) {
			const d = max - min;
			s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

			switch (max) {
				case r:
					h = (g - b) / d + (g < b ? 6 : 0);
					break;
				case g:
					h = (b - r) / d + 2;
					break;
				default:
					h = (r - g) / d + 4;
					break;
			}

			h /= 6;
		}

		return { h, s, l };
	}

	function hslToRgb(h, s, l) {
		let r;
		let g;
		let b;

		if (s === 0) {
			r = g = b = l;
		} else {
			const hue2rgb = (p, q, t) => {
				if (t < 0) t += 1;
				if (t > 1) t -= 1;
				if (t < 1 / 6) return p + (q - p) * 6 * t;
				if (t < 1 / 2) return q;
				if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
				return p;
			};

			const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
			const p = 2 * l - q;

			r = hue2rgb(p, q, h + 1 / 3);
			g = hue2rgb(p, q, h);
			b = hue2rgb(p, q, h - 1 / 3);
		}

		return {
			r: Math.round(r * 255),
			g: Math.round(g * 255),
			b: Math.round(b * 255)
		};
	}

	function isLidPixel(r, g, b, a) {
        if (a < 10) return false;

        const { s, l } = rgbToHsl(r, g, b);

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;

        // прозрачное / почти чёрное / почти белое
        if (l < 0.07 || l > 0.93) return false;

        // нейтральные серые и серебристые металлы
        if (s < 0.22) return false;

        // очень слабое цветовое различие между каналами
        if (delta < 32) return false;

        // светлый металл с цветным отражением крышки
        if (l > 0.62 && s < 0.38) return false;

        // характерный серебристый металл:
        // каналы близки между собой
        if (
            Math.abs(r - g) < 28 &&
            Math.abs(g - b) < 28 &&
            Math.abs(r - b) < 28
        ) {
            return false;
        }

        return true;
    }

	async function loadImage(src) {
		if (state.imageCache.has(src)) {
			return state.imageCache.get(src);
		}

		const promise = new Promise((resolve, reject) => {
			const img = new Image();
			img.crossOrigin = 'anonymous';
			img.onload = () => resolve(img);
			img.onerror = reject;
			img.src = src;
		});

		state.imageCache.set(src, promise);
		return promise;
	}

	function recolorImageData(imageData, ralColor) {
        if (!ralColor) return imageData;

        const targetRgb = hexToRgb(ralColor.hex);
        if (!targetRgb) return imageData;

        const targetHsl = rgbToHsl(targetRgb.r, targetRgb.g, targetRgb.b);
        const data = imageData.data;

        const isNeutralTarget = targetHsl.s < 0.12;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            if (!isLidPixel(r, g, b, a)) continue;

            const sourceHsl = rgbToHsl(r, g, b);

            let newColor;

            if (isNeutralTarget) {
                /*
                * Серые / белые / алюминиевые RAL.
                * Hue не используем вообще.
                * Сохраняем рельеф и светотень исходной крышки.
                */

                const shade = sourceHsl.l - 0.5;

                let newLightness =
                    targetHsl.l +
                    shade * 0.72;

                newLightness = Math.max(
                    0.03,
                    Math.min(0.97, newLightness)
                );

                newColor = hslToRgb(
                    0,
                    targetHsl.s,
                    newLightness
                );
            } else {
                /*
                * Цветные RAL.
                * Меняем оттенок и насыщенность,
                * но сохраняем исходную светотень.
                */

                let hue = targetHsl.h;
                let saturation = targetHsl.s;
                let lightness = sourceHsl.l;

                switch (ralColor.code) {
                    case 'RAL 3000':
                        hue = 0.006;
                        saturation = 0.72;
                        lightness = Math.max(
                            0.16,
                            Math.min(
                                0.52,
                                0.31 + (sourceHsl.l - 0.50) * 0.58
                            )
                        );
                        break;

                    case 'RAL 3001':
                        hue = 0.003;
                        saturation = 0.77;
                        lightness = Math.max(
                            0.14,
                            Math.min(
                                0.48,
                                0.28 + (sourceHsl.l - 0.50) * 0.55
                            )
                        );
                        break;

                    case 'RAL 3020':
                        hue = 0.000;
                        saturation = 0.94;
                        lightness = Math.max(
                            0.16,
                            Math.min(
                                0.54,
                                0.34 + (sourceHsl.l - 0.50) * 0.58
                            )
                        );
                        break;

                    case 'RAL 5005':
                        hue = 0.595;
                        saturation = 0.68;
                        lightness = Math.max(
                            0.14,
                            Math.min(
                                0.50,
                                0.30 + (sourceHsl.l - 0.50) * 0.56
                            )
                        );
                        break;

                    case 'RAL 5017':
                        hue = 0.595;
                        saturation = 0.82;
                        lightness = Math.max(
                            0.12,
                            Math.min(
                                0.45,
                                0.25 + (sourceHsl.l - 0.50) * 0.52
                            )
                        );
                        break;

                    case 'RAL 6024':
                        hue = targetHsl.h;
                        saturation = Math.min(0.82, targetHsl.s);
                        lightness = Math.max(
                            0.16,
                            Math.min(
                                0.46,
                                0.27 + (sourceHsl.l - 0.50) * 0.45
                            )
                        );
                        break;

                    default:
                        break;
                }

                newColor = hslToRgb(
                    hue,
                    saturation,
                    lightness
                );

                newColor = hslToRgb(
                    hue,
                    saturation,
                    lightness
                );
            }

            data[i] = newColor.r;
            data[i + 1] = newColor.g;
            data[i + 2] = newColor.b;
        }

        return imageData;
    }

	async function renderCurrentView() {
		if (!state.item || !state.view) {
			clearCanvas();
			viewerPlaceholder.hidden = false;
			viewerPlaceholder.textContent = 'Выберите люк для просмотра';
			return;
		}

		const src = getViews()[state.view];
		if (!src) {
			clearCanvas();
			viewerPlaceholder.hidden = false;
			viewerPlaceholder.textContent = 'Для выбранного ракурса изображение не задано';
			return;
		}

		const token = ++state.renderingToken;

		try {
			viewerPlaceholder.hidden = false;
			viewerPlaceholder.textContent = 'Загрузка изображения…';

			const img = await loadImage(src);
			if (token !== state.renderingToken) return;

			canvas.width = img.naturalWidth || img.width || 1;
			canvas.height = img.naturalHeight || img.height || 1;

			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

			if (state.ral) {
				const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
				ctx.putImageData(recolorImageData(imageData, state.ral), 0, 0);
			}

			canvas.style.display = 'block';
			viewerPlaceholder.hidden = true;

			if (image) {
				image.alt = buildImageAlt();
				image.hidden = true;
			}
		} catch (error) {
			if (token !== state.renderingToken) return;

			clearCanvas();
			viewerPlaceholder.hidden = false;
			viewerPlaceholder.textContent = 'Изображение не удалось загрузить';
			console.error('lyuki-ral image render error:', error);
		}
	}

	function setView(view) {
		if (!state.item) return;

		const src = getViews()[view];
		if (!src) return;

		state.view = view;

		updateViewButtons();
		updateQuoteLink();
		renderCurrentView();
		dispatchSelectionChange();
	}

	function renderProduct() {
		if (!state.item) {
			clearViewer();
			return;
		}

		stopSlideshow();

		if (productTitle) productTitle.textContent = state.item.item_name || 'Промышленный люк';
        if (productSize) {
            productSize.innerHTML = state.item.size
                ? `<span>Размеры:</span> ${state.item.size} мм`
                : '';
        }

		const available = getAvailableViews();
		state.view = available.includes('front') ? 'front' : (available[0] || '');

		updateViewButtons();
		updateQuoteLink();
		renderCurrentView();
		dispatchSelectionChange();
	}

    function wrapCanvasText(ctx, text, maxWidth) {
        const words = String(text || '').split(/\s+/);
        const lines = [];
        let line = '';

        words.forEach(word => {
            const testLine = line ? `${line} ${word}` : word;

            if (ctx.measureText(testLine).width > maxWidth && line) {
                lines.push(line);
                line = word;
            } else {
                line = testLine;
            }
        });

        if (line) {
            lines.push(line);
        }

        return lines;
    }

    function fitImageInBox(sourceWidth, sourceHeight, boxX, boxY, boxWidth, boxHeight) {
        const scale = Math.min(
            boxWidth / sourceWidth,
            boxHeight / sourceHeight
        );

        const width = sourceWidth * scale;
        const height = sourceHeight * scale;

        return {
            x: boxX + (boxWidth - width) / 2,
            y: boxY + (boxHeight - height) / 2,
            width,
            height
        };
    }

    function sanitizeFilename(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/[×х]/g, 'x')
            .replace(/ral\s*/gi, 'ral-')
            .replace(/[^a-zа-яё0-9_-]+/gi, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 140);
    }

    function saveConfiguredImage() {
        if (!state.item || !state.view || !canvas.width || !canvas.height) {
            return;
        }

        const category = getCurrentCategory();
        const width = 1400;
        const height = 1050;

        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = width;
        exportCanvas.height = height;

        const exportCtx = exportCanvas.getContext('2d');

        if (!exportCtx) return;

        exportCtx.fillStyle = '#ffffff';
        exportCtx.fillRect(0, 0, width, height);

        const left = 55;
        const right = 55;
        const contentWidth = width - left - right;

        /*
        * Название изделия
        */
        exportCtx.fillStyle = '#303030';
        exportCtx.font = '400 34px Arial, sans-serif';

        const title = state.item.item_name || 'Промышленный люк';
        const titleLines = wrapCanvasText(exportCtx, title, contentWidth);

        let titleY = 65;

        titleLines.slice(0, 2).forEach(line => {
            exportCtx.fillText(line, left, titleY);
            titleY += 42;
        });

        /*
        * Категория
        */
        if (category?.category) {
            exportCtx.fillStyle = '#777777';
            exportCtx.font = '400 18px Arial, sans-serif';
            exportCtx.fillText(category.category, left, titleY + 4);
            titleY += 30;
        }

        /*
        * Размеры + ракурс
        */
        exportCtx.fillStyle = '#444444';
        exportCtx.font = '400 26px Arial, sans-serif';

        let specification = state.item.size
            ? `Размеры: ${state.item.size} мм`
            : '';

        const viewNames = {
            front: 'Вид спереди',
            side_a: 'Сбоку',
            top: 'Сверху'
        };

        if (state.view && viewNames[state.view]) {
            specification += specification
                ? ` · ${viewNames[state.view]}`
                : viewNames[state.view];
        }

        exportCtx.fillText(specification, left, titleY + 12);

        /*
        * Карточка выбранного RAL
        */
        let imageTop = titleY + 70;

        if (state.ral) {
            const cardX = left;
            const cardY = imageTop;
            const cardWidth = 390;
            const cardHeight = 110;

            exportCtx.fillStyle = '#ffffff';
            exportCtx.strokeStyle = '#dddddd';
            exportCtx.lineWidth = 2;

            exportCtx.beginPath();

            if (typeof exportCtx.roundRect === 'function') {
                exportCtx.roundRect(cardX, cardY, cardWidth, cardHeight, 14);
            } else {
                exportCtx.rect(cardX, cardY, cardWidth, cardHeight);
            }

            exportCtx.fill();
            exportCtx.stroke();

            exportCtx.fillStyle = state.ral.hex;
            exportCtx.beginPath();
            exportCtx.arc(cardX + 54, cardY + 55, 30, 0, Math.PI * 2);
            exportCtx.fill();

            exportCtx.fillStyle = '#333333';
            exportCtx.font = '700 24px Arial, sans-serif';
            exportCtx.fillText(state.ral.name, cardX + 105, cardY + 48);

            exportCtx.fillStyle = '#666666';
            exportCtx.font = '400 21px Arial, sans-serif';
            exportCtx.fillText(state.ral.code, cardX + 105, cardY + 77);

            imageTop += 125;
        }

        /*
        * Сам люк — берём уже готовый recolored canvas.
        */
        const imageBox = fitImageInBox(
            canvas.width,
            canvas.height,
            left,
            imageTop,
            contentWidth,
            560
        );

        exportCtx.drawImage(
            canvas,
            0,
            0,
            canvas.width,
            canvas.height,
            imageBox.x,
            imageBox.y,
            imageBox.width,
            imageBox.height
        );

        /*
        * Примечание PRIMATEK
        */
        const noticeY = 870;

        exportCtx.fillStyle = '#969696';
        exportCtx.font = '400 18px Arial, sans-serif';

        const notice = 'Представленные цвета являются визуализацией доступных вариантов порошкового покрытия PRIMATEK. Цветопередача экрана может отличаться от фактического оттенка покрытия.';

        const noticeLines = wrapCanvasText(
            exportCtx,
            notice,
            contentWidth
        );

        noticeLines.forEach((line, index) => {
            exportCtx.fillText(line, left, noticeY + index * 24);
        });

        /*
        * Разделитель
        */
        exportCtx.strokeStyle = '#e0e0e0';
        exportCtx.lineWidth = 1;
        exportCtx.beginPath();
        exportCtx.moveTo(left, 950);
        exportCtx.lineTo(width - right, 950);
        exportCtx.stroke();

        /*
        * Copyright
        */
        exportCtx.fillStyle = '#555555';
        exportCtx.font = '400 16px Arial, sans-serif';

        exportCtx.fillText(
            '© 2026 MetalVal — RAL Product Configurator.',
            left,
            982
        );

        exportCtx.fillText(
            'Portfolio demo based on a production B2B configurator.',
            left,
            1008
        );

        /*
        * Имя файла
        */
        const fileParts = [
            category?.category || '',
            state.item.size || '',
            state.view || '',
            state.ral?.code || ''
        ].filter(Boolean);

        const filename = `${sanitizeFilename(fileParts.join('-')) || 'metalval-luk'}.png`;

        exportCanvas.toBlob(blob => {
            if (!blob) return;

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = url;
            link.download = filename;

            document.body.appendChild(link);
            link.click();
            link.remove();

            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 1000);
        }, 'image/png', 1);
    }

	function updateQuoteLink() {
		if (!quoteButton) return;

		const params = new URLSearchParams();
		const category = getCurrentCategory();

		if (category?.category) params.set('category', category.category);
		if (state.item?.item_name) params.set('item', state.item.item_name);
		if (state.item?.size) params.set('size', state.item.size);
		if (state.ral?.code) params.set('ral', state.ral.code);
		if (state.view) params.set('view', state.view);

		quoteButton.href = params.toString() ? `https://metalval.ru/feedback/?${params.toString()}` : 'https://metalval.ru/feedback/';
	}

	function dispatchSelectionChange() {
		const category = getCurrentCategory();

		document.dispatchEvent(new CustomEvent('lyukiRal:change', {
			detail: {
				category: category?.category || '',
				item: state.item?.item_name || '',
				size: state.item?.size || '',
				view: state.view || '',
				ral: state.ral || null,
				image: state.item && state.view ? (getViews()[state.view] || '') : ''
			}
		}));
	}

	function openPopup() {
		popup.classList.add('isOpen');
		popup.setAttribute('aria-hidden', 'false');
		document.documentElement.classList.add('lyukiRalLock');
	}

	function closePopup() {
		stopSlideshow();
		popup.classList.remove('isOpen');
		popup.setAttribute('aria-hidden', 'true');
		document.documentElement.classList.remove('lyukiRalLock');
	}

    function stopSlideshow() {
        if (state.slideshowTimer) {
            clearInterval(state.slideshowTimer);
            state.slideshowTimer = null;
        }

        if (state.slideshowCountdownTimer) {
            clearInterval(state.slideshowCountdownTimer);
            state.slideshowCountdownTimer = null;
        }

        state.slideshowRunning = false;

        if (slideshowButton) {
            slideshowButton.textContent = 'Включить слайдшоу';
            slideshowButton.classList.remove('activated');
        }

        if (slideshowProgress) {
            slideshowProgress.classList.remove('isVisible');
        }
    }

    function startSlideshow() {
        const available = getAvailableViews();

        if (available.length < 2 || !slideshowButton) return;

        state.slideshowRunning = true;
        slideshowButton.textContent = 'Остановить слайдшоу';

        slideshowButton.classList.add('activated');

        slideshowProgress.classList.add('isVisible');
        restartSlideshowProgress();

        state.slideshowTimer = setInterval(() => {
            const currentIndex = Math.max(0, available.indexOf(state.view));
            const nextIndex = (currentIndex + 1) % available.length;

            canvas.classList.add('isFading');

            setTimeout(() => {
                setView(available[nextIndex]);

                setTimeout(() => {
                    canvas.classList.remove('isFading');
                }, 80);

                restartSlideshowProgress();
            }, 450);

        }, state.slideshowDuration);
    }

	function toggleSlideshow() {
		if (!slideshowButton) return;
		state.slideshowRunning ? stopSlideshow() : startSlideshow();
	}

    function openConsultation() {
        const detail = {
            category: getCurrentCategory()?.category || '',
            item: state.item?.item_name || '',
            size: state.item?.size || '',
            view: state.view || '',
            ral: state.ral?.code || ''
        };

        document.dispatchEvent(new CustomEvent('lyukiRal:consult', {
            detail
        }));

        closePopup();

        setTimeout(() => {
            const assistantButton = null;

            if (assistantButton) {
                assistantButton.click();
            }
        }, 180);
    }

	function guessInitialSelection() {
		if (!categories.length) {
			return { categoryIndex: -1, itemIndex: -1 };
		}

		const path = normalize(window.location.pathname || '');
		const sizeMatch = path.match(/(\d{3,4}[xх×]\d{3,4}(?:[xх×]\d{2,4})?)/i);
		const wantedSize = sizeMatch ? normalizeSize(sizeMatch[1]) : '';

		const keywordChecks = [
			{ pattern: /inspektsion|izmeritel|toplivnogo-rezervuara|topliv/, keyword: 'инспекцион' },
			{ pattern: /magistral|gazoprovod/, keyword: 'магистраль' },
			{ pattern: /alyumini|alyuminiev|alyum/, keyword: 'алюмини' },
			{ pattern: /pozharn|fire/, keyword: 'пожар' }
		];

		let best = { categoryIndex: 0, itemIndex: 0, score: -1 };

		categories.forEach((category, categoryIndex) => {
			const categoryName = normalize(category.category || '');
			const items = Array.isArray(category.items) ? category.items : [];

			items.forEach((item, itemIndex) => {
				let score = 0;
				const itemName = normalize(item.item_name || '');
				const itemSize = normalizeSize(item.size || '');

				keywordChecks.forEach(check => {
					if (check.pattern.test(path) && (categoryName.includes(check.keyword) || itemName.includes(check.keyword))) {
						score += 5;
					}
				});

				if (wantedSize && itemSize === wantedSize) score += 20;
				if (path.includes('1200x3600') && itemSize.includes('1200x3600')) score += 20;
				if (path.includes('1110x900') && itemSize.includes('1110x900')) score += 20;
				if (path.includes('1000x800') && itemSize.includes('1000x800')) score += 20;
				if (path.includes('900x900') && itemSize.includes('900x900')) score += 20;
				if (path.includes('900x600') && itemSize.includes('900x600')) score += 20;

				if (score > best.score) {
					best = { categoryIndex, itemIndex, score };
				}
			});
		});

		return { categoryIndex: best.categoryIndex, itemIndex: best.itemIndex };
	}

    categorySelect.addEventListener('mousedown', () => {
        if (categorySelectWrap) {
            categorySelectWrap.classList.add('isOpen');
        }
    });

    categorySelect.addEventListener('change', () => {
        stopSlideshow();

        const index = parseInt(categorySelect.value, 10);
        state.categoryIndex = Number.isInteger(index) ? index : -1;

        updateCategoryDisplay();

        if (categorySelectWrap) {
            categorySelectWrap.classList.remove('isOpen');
        }

        populateSizes();
    });

    categorySelect.addEventListener('blur', () => {
        if (categorySelectWrap) {
            categorySelectWrap.classList.remove('isOpen');
        }
    });

	sizeSelect.addEventListener('change', () => {
		stopSlideshow();

		const items = getCategoryItems();
		const itemIndex = parseInt(sizeSelect.value, 10);

		state.item = Number.isInteger(itemIndex) ? (items[itemIndex] || null) : null;

		renderProduct();
	});

	viewButtons.forEach(button => {
		button.addEventListener('click', () => {
			if (!button.disabled) {
				stopSlideshow();
				setView(button.dataset.view);
			}
		});
	});

	searchInput.addEventListener('input', () => renderColors(searchInput.value));

	if (slideshowButton) {
		slideshowButton.addEventListener('click', toggleSlideshow);
	}

    if (saveImageButton) {
        saveImageButton.addEventListener('click', saveConfiguredImage);
    }

	if (consultButton) {
		consultButton.addEventListener('click', openConsultation);
	}

	openButtons.forEach(button => button.addEventListener('click', openPopup));
	closeButtons.forEach(button => button.addEventListener('click', closePopup));

	document.addEventListener('keydown', event => {
		if (event.key === 'Escape' && popup.classList.contains('isOpen')) {
			closePopup();
		}
	});

	populateCategories();
	renderColors();

	const initial = guessInitialSelection();

	if (initial.categoryIndex >= 0) {
		state.categoryIndex = initial.categoryIndex;
		categorySelect.value = String(initial.categoryIndex);
        updateCategoryDisplay();
		populateSizes(initial.itemIndex);
	} else {
		clearViewer();
	}
})();