document.addEventListener('DOMContentLoaded', () => {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const formationForm = document.getElementById('formation-form');
    const progressionForm = document.getElementById('progression-form');
    const additionalParamsForm = document.getElementById('additional-params-form');
    const resultSection = document.getElementById('result');
    const resultText = document.getElementById('result-text');
    const resultChart = document.getElementById('result-chart');

    let chart = null;
    let lastCalculatedResult = null;

    // Переключение вкладок
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(button.dataset.tab).classList.add('active');
        });
    });

    // Функция расчета формирования ТИПП
    function calculateFormation(il6, tnfa, vd) {
        return 84.819 + 2.021 * il6 - 0.857 * tnfa + 0.576 * vd;
    }

    // Функция расчета прогрессирования ТИПП
    function calculateProgression(il1, il10, albumin) {
        return 46.463 - 0.509 * il1 - 0.772 * il10 + 0.453 * albumin;
    }

    // Обработка формы формирования ТИПП
    formationForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const il6 = parseFloat(document.getElementById('il6').value);
        const tnfa = parseFloat(document.getElementById('tnfa').value);
        const vd = parseFloat(document.getElementById('vd').value);

        const result = calculateFormation(il6, tnfa, vd);
        lastCalculatedResult = { value: result, type: 'formation' };
        displayResult(result, 'formation');
    });

    // Обработка формы прогрессирования ТИПП
    progressionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const il1 = parseFloat(document.getElementById('il1').value);
        const il10 = parseFloat(document.getElementById('il10').value);
        const albumin = parseFloat(document.getElementById('albumin').value);

        const result = calculateProgression(il1, il10, albumin);
        lastCalculatedResult = { value: result, type: 'progression' };
        displayResult(result, 'progression');
    });

    // Отображение результата
    function displayResult(result, type, additionalParams = null) {
        let interpretation = '';
        let risk = '';
        let adjustedResult = result;

        if (additionalParams) {
            adjustedResult = adjustResultWithAdditionalParams(result, type, additionalParams);
        }

        if (type === 'formation') {
            if (adjustedResult <= 90) {
                interpretation = 'Высокий риск формирования ТИПП';
                risk = 'high';
            } else if (adjustedResult > 90 && adjustedResult <= 100) {
                interpretation = 'Умеренный риск формирования ТИПП';
                risk = 'moderate';
            } else {
                interpretation = 'Низкий риск формирования ТИПП';
                risk = 'low';
            }
        } else {
            if (adjustedResult <= 60) {
                interpretation = 'Высокий риск прогрессирования ТИПП';
                risk = 'high';
            } else if (adjustedResult > 60 && adjustedResult <= 90) {
                interpretation = 'Умеренный риск прогрессирования ТИПП';
                risk = 'moderate';
            } else {
                interpretation = 'Низкий риск прогрессирования ТИПП';
                risk = 'low';
            }
        }

        resultText.innerHTML = `
            <p><strong>Исходный результат:</strong> ${result.toFixed(2)}</p>
            <p><strong>Скорректированный результат:</strong> ${adjustedResult.toFixed(2)}</p>
            <p><strong>Интерпретация:</strong> ${interpretation}</p>
        `;

        if (additionalParams) {
            resultText.innerHTML += generateAdditionalInfo(additionalParams);
        }

        updateChart(adjustedResult, risk);
        resultSection.style.display = 'block';
    }

    // Корректировка результата с учетом дополнительных параметров
    function adjustResultWithAdditionalParams(result, type, params) {
        let adjustment = 0;
    
        // Корректировка на основе ИЛ-8
        if (params.il8 > 20) adjustment -= 1;
        else if (params.il8 < 10) adjustment += 1;
    
        // Корректировка на основе ТФР-β
        if (params.tgfb > 10) adjustment -= 1;
        else if (params.tgfb < 5) adjustment += 1;
    
        // Корректировка на основе Vs
        if (params.vs < 15) adjustment -= 1;
        else if (params.vs > 25) adjustment += 1;
    
        // Корректировка на основе СКФ
        if (params.gfr < 60) adjustment -= 2;
        else if (params.gfr > 90) adjustment += 1;
    
        // Корректировка на основе артериального давления
        if (params.sad > 140 || params.dad > 90) adjustment -= 2;
    
        // Корректировка на основе степени ПМР
        if (params.pmr >= 3) adjustment -= 1;
    
        // Корректировка на основе стадии РН
        if (params.rn === 'C' || params.rn === 'D') adjustment -= 2;
    
        return Math.max(0, Math.min(120, result + adjustment));
    }

    // Обновление графика
    function updateChart(result, risk) {
        if (chart) {
            chart.destroy();
        }

        const ctx = resultChart.getContext('2d');
        chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [result, 120 - result],
                    backgroundColor: [
                        risk === 'high' ? '#e74c3c' : (risk === 'moderate' ? '#f39c12' : '#2ecc71'),
                        '#ecf0f1'
                    ]
                }]
            },
            options: {
                cutout: '70%',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: false
                    }
                }
            },
            plugins: [{
                id: 'centerText',
                afterDraw: (chart) => {
                    const { ctx, chartArea: { top, right, bottom, left, width, height } } = chart;
                    ctx.save();

                    ctx.font = '16px Arial';
                    ctx.fillStyle = '#666';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(result.toFixed(2), width / 2, height / 2);

                    ctx.restore();
                }
            }]
        });
    }

    // Генерация дополнительной информации
    function generateAdditionalInfo(params) {
        const { il8, tgfb, vs, gfr, sad, dad, pmr, rn } = params;
        let ckdStage = classifyCKD(gfr);
        let bloodPressureCategory = classifyBloodPressure(sad, dad);
        let pmrRisk = classifyPMR(pmr);
        let rnStage = classifyRN(rn);

        return `
            <h4>Дополнительные параметры:</h4>
            <p><strong>ИЛ-8:</strong> ${il8 || 'Не указано'} пг/мл/24 ч</p>
            <p><strong>ТФР-β:</strong> ${tgfb || 'Не указано'} пг/мл/24 ч</p>
            <p><strong>Vs:</strong> ${vs || 'Не указано'} мм/с</p>
            <p><strong>СКФ:</strong> ${gfr || 'Не указано'} мл/мин/1.73 м2 ${ckdStage}</p>
            <p><strong>САД:</strong> ${sad || 'Не указано'} мм рт.ст.</p>
            <p><strong>ДАД:</strong> ${dad || 'Не указано'} мм рт.ст.</p>
            <p><strong>Категория АД:</strong> ${bloodPressureCategory}</p>
            <p><strong>Степень ПМР:</strong> ${pmr || 'Не указано'} (${pmrRisk})</p>
            <p><strong>Стадия РН:</strong> ${rn || 'Не указано'} (${rnStage})</p>
        `;
    }

    // Классификация ХБП
    function classifyCKD(gfr) {
        if (gfr >= 90) return '(ХБП стадия 1)';
        if (gfr >= 60 && gfr < 90) return '(ХБП стадия 2)';
        if (gfr >= 30 && gfr < 60) return '(ХБП стадия 3)';
        if (gfr >= 15 && gfr < 30) return '(ХБП стадия 4)';
        if (gfr < 15) return '(ХБП стадия 5)';
        return '(Недостаточно данных)';
    }

    // Классификация артериального давления
    function classifyBloodPressure(sad, dad) {
        if (sad < 120 && dad < 80) return 'Нормальное';
        if ((sad >= 120 && sad < 130) && dad < 80) return 'Повышенное';
        if ((sad >= 130 && sad < 140) || (dad >= 80 && dad < 90)) return 'Гипертония 1 степени';
        if (sad >= 140 || dad >= 90) return 'Гипертония 2 степени';
        return 'Недостаточно данных';
    }

    // Классификация ПМР
    function classifyPMR(pmr) {
        switch(pmr) {
            case '1': return 'Низкий риск';
            case '2': return 'Низкий риск';
            case '3': return 'Умеренный риск';
            case '4': return 'Высокий риск';
            case '5': return 'Высокий риск';
            default: return 'Недостаточно данных';
        }
    }

    // Классификация РН
    function classifyRN(rn) {
        switch(rn) {
            case 'A': return 'Начальная стадия';
            case 'B': return 'Умеренная стадия';
            case 'C': return 'Выраженная стадия';
            case 'D': return 'Терминальная стадия';
            default: return 'Недостаточно данных';
        }
    }

    // Обработка дополнительных параметров
    additionalParamsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const additionalParams = {
            il8: parseFloat(document.getElementById('il8').value),
            tgfb: parseFloat(document.getElementById('tgfb').value),
            vs: parseFloat(document.getElementById('vs').value),
            gfr: parseFloat(document.getElementById('gfr').value),
            sad: parseFloat(document.getElementById('sad').value),
            dad: parseFloat(document.getElementById('dad').value),
            pmr: document.getElementById('pmr').value,
            rn: document.getElementById('rn').value
        };

        if (lastCalculatedResult) {
            displayResult(lastCalculatedResult.value, lastCalculatedResult.type, additionalParams);
        } else {
            resultText.innerHTML = 'Пожалуйста, сначала выполните основной расчет.';
        }
    });
});