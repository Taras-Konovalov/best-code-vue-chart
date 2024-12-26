import type { Chart, ChartData, ChartOptions, ScriptableContext, ScriptableLineSegmentContext } from 'chart.js'

import type { UserTechnologyHistoriesModel, UserTechnologyModel } from '~/api/skills/models'
import { AppColors } from '~/enums/appEnum'
import { TabId, TechStatus } from '~/enums/skillEnum'

export function useTechnologyHistorySkillsChart() {
  const technologyHistoryStore = useTechnologyHistoryStore()
  const skillStore = useSkillStore()

  const isOpenSkills = ref<boolean>(false)
  const heightChart = ref<number | null>(null)
  // Функция для вычисления цвета точки на графике
  function getPointColor(ctx: ScriptableContext<'line'>) {
    const currentLevelOnAxis = ctx?.raw?.x
    const userHistory = ctx?.raw?.point
    // Последний подтвержденный уровень владения
    const lastСonfirmedLevel = userHistory[0]?.TechnologyKnowledge.level
    // Первый подтвержденный уровень владения
    const firstСonfirmedLevel = userHistory[userHistory.length - 1]?.TechnologyKnowledge.level

    if (currentLevelOnAxis === firstСonfirmedLevel)
      return AppColors.DARK_BLUE
    if (currentLevelOnAxis === lastСonfirmedLevel)
      return AppColors.GREEN

    for (const level of getLogLevels(userHistory, firstСonfirmedLevel, lastСonfirmedLevel)) {
      if (level === currentLevelOnAxis)
        return ctx.raw.color
    }
  }

  // Функция для вычисления размера точки на графике
  function getPointSize(ctx: ScriptableContext<'line'>) {
    const currentLevelOnAxis = ctx?.raw?.x
    const userHistory = ctx?.raw?.point

    // Последний подтвержденный уровень владения со статусом 'approved'
    const lastСonfirmedLevel = userHistory[0]?.TechnologyKnowledge?.level
    // Первый подтвержденный уровень владения со статусом 'approved'
    const firstСonfirmedLevel = userHistory[userHistory.length - 1].TechnologyKnowledge.level

    if (currentLevelOnAxis === lastСonfirmedLevel || currentLevelOnAxis === firstСonfirmedLevel)
      return 10

    for (const level of getLogLevels(userHistory, firstСonfirmedLevel, lastСonfirmedLevel)) {
      if (level === currentLevelOnAxis)
        return 4
    }
  }

  // Функция для вычисления цвета border на точке(в случае если первый и последний апрув совпадают или всего один апрув)
  function getPointBorderColor(ctx: ScriptableContext<'line'>) {
    const currentLevelOnAxis = ctx?.raw?.x
    const userHistory = ctx.raw.point
    // Последний подтвержденный уровень владения со статусом 'approved'
    const lastСonfirmedLevel = userHistory[0].TechnologyKnowledge.level
    // Первый подтвержденный уровень владения со статусом 'approved'
    const firstСonfirmedLevel = userHistory[userHistory.length - 1].TechnologyKnowledge.level

    if ((lastСonfirmedLevel === firstСonfirmedLevel && userHistory.length <= 2)
  || (lastСonfirmedLevel === currentLevelOnAxis))
      return AppColors.GREEN

    if (firstСonfirmedLevel === currentLevelOnAxis)
      return AppColors.DARK_BLUE

    for (const level of getLogLevels(userHistory, firstСonfirmedLevel, lastСonfirmedLevel)) {
      if (level === currentLevelOnAxis)
        return getPointColor(ctx)
    }
  }

  // Функция для получения тех уровней со статусом 'approved' на которых есть логи, не включая lastСonfirmedLevel и firstСonfirmedLevel
  function getLogLevels(userHistory: UserTechnologyHistoriesModel[], firstСonfirmedLevel: number, lastСonfirmedLevel: number) {
    return [...new Set(userHistory.map(level => level.TechnologyKnowledge?.level))].filter(item => item !== lastСonfirmedLevel && item !== firstСonfirmedLevel)
  }

  // Функция для получения цвета полоски
  // currentLevelOnAxis - текущий уровень на оси X
  // userHistory - история изменений уровня владения технологией
  function getColor(currentLevelOnAxis: number, userHistory: UserTechnologyHistoriesModel[]) {
    // Последний подтвержденный уровень владения
    const lastСonfirmedLevel = userHistory[0].TechnologyKnowledge.level
    // Первый подтвержденный уровень владения
    const firstСonfirmedLevel = userHistory[userHistory.length - 1].TechnologyKnowledge.level
    if (userHistory.length === 1)
      return AppColors.LIGHT_MOOD_STATUS_SUCCESS

    if (userHistory.length === 2) {
      if (lastСonfirmedLevel >= firstСonfirmedLevel)
        return AppColors.LIGHT_MOOD_STATUS_SUCCESS

      else if (lastСonfirmedLevel < firstСonfirmedLevel)
        return AppColors.ICON_YELLOW
    }

    if (userHistory.length > 2) {
      if (currentLevelOnAxis <= lastСonfirmedLevel - 1)
        return AppColors.LIGHT_MOOD_STATUS_SUCCESS

      else
        return AppColors.LIGHT_MOOD_BORDER_ERROR
    }
  }

  // Функция для полчения наименования уровня владения в заивисмотси от levelId
  function getLevelName(levelId: number, isFullName = false) {
    const skill = skillStore.getLevelsByTypeSkills(technologyHistoryStore.technologyTypeId!).find(skill => skill.level === levelId)
    if (skill) {
      if (isFullName)
        return `[${levelId}] ${skill.name}`
      else
        return `[${levelId}] ${skill.name}`.replace(/-.*/, '')
    }

    return null
  }

  // Формирование данных для построения графика
  const dataLineChart = computed(() => {
    let skills: UserTechnologyModel[] | null = null

    // все скиллы юзера по заданому типу
    const allUserSkillsByType = technologyHistoryStore.getUsersSkillsByTypeIdAndSkillFilter
      // Оставляем в UserTechnologyHistories только те сущности которые имееют статус 'approved'
      .map(skill => ({ ...skill, UserTechnologyHistories: skill.UserTechnologyHistories.filter(item => item.status === TechStatus.APPROVED) }))
      // Убираем те технологии которые имеют в UserTechnologyHistories пустой массив
      .filter(skill => skill.UserTechnologyHistories.length)
      // сортируем по дате последненго апрува со статусом 'approved' по убыванию(самая верхняя дата - самая "свежая" по дате)
      .sort((a, b) => new Date(a.UserTechnologyHistories[0].createdAt).getTime() - new Date(b.UserTechnologyHistories[0].createdAt).getTime())

    const data: ChartData<'line'> = {
      labels: [],
      datasets: [],
    }

    // если кнопка не активная отображаем первые 5 скиллов иначе все
    if (!isOpenSkills.value)
      skills = allUserSkillsByType.slice(-5)
    else
      skills = allUserSkillsByType

    // переменная для подсчета количества скиллов, используется для расчета высоты графика
    const skillCount = skills.length

    const allSkills = allUserSkillsByType.length

    // переменная используется для отображения значений по оси X, количесвто уровней владения техноллогией в зависимости от типа скиллов
    const levels = [0, ...skillStore.getLevelsByTypeSkills(technologyHistoryStore.technologyTypeId!)?.sort((a, b) => a.level - b.level).map(({ level }) => level)]

    data.labels = levels

    // переменная используется для отображения значений по оси Y
    const numericYAxic = skills.map((item, index) => index)

    // сохраняем название скиллов в ввиде ключ - значение, для отображания на оси Y
    const yLabels: Record<string, string> = {}
    // сохраняем даты последненго апрува в виде ключ - значение, для второстипенной оси Y
    const dateYLabels: Record<string, string> = {}

    // формируем yLabels и dateYLabels
    skills.forEach((obj, index) => {
      const i = index
      const technologyName = obj.Technology.name
      const lastСonfirmedLevelDate = useDateFormat(obj.UserTechnologyHistories[0]?.createdAt, 'DD.MM.YYYY').value
      yLabels[i] = technologyName
      dateYLabels[i] = lastСonfirmedLevelDate
    })

    // формируем datasets для построения графика
    const datasets = skills.map((item, index) => {
      const maxLevel = Math.max(...item.UserTechnologyHistories.map(history => history.TechnologyKnowledge.level))
      const minLevel = Math.min(...item.UserTechnologyHistories.map(history => history.TechnologyKnowledge.level))
      const data = Array.from({ length: maxLevel - minLevel + 1 }, (_, i) => ({
        x: minLevel + i,
        y: index,
        color: getColor(minLevel + i, item.UserTechnologyHistories),
        point: item.UserTechnologyHistories,
      }))
      const segment = {
        borderColor: (ctx: ScriptableLineSegmentContext) => {
          return data[ctx.p0DataIndex].color
        },
      }
      return { label: numericYAxic[index], data, segment, yAxisID: 'y' }
    })

    // формируем datasets для второстипенной оси Y
    const rightScaleDateY = datasets.map(item => ({ ...item, yAxisID: 'dateY' }))

    data.datasets = [...datasets, ...rightScaleDateY]

    return { data, yLabels, dateYLabels, skillCount, allSkills }
  })

  function clearTooltipInfo(tooltipEl: HTMLElement) {
    const tooltipInfo = tooltipEl.querySelector('.tooltip-info')
    if (tooltipInfo)
      tooltipInfo.innerHTML = ''
  }

  function createTooltipInfoItem(date: string, skill: string, wishes: string) {
    const item = document.createElement('div')
    item.className = 'tooltip-info-item'

    const dateParagraph = document.createElement('p')
    dateParagraph.className = 'date'
    dateParagraph.style.color = AppColors.WHITE
    dateParagraph.textContent = date

    const skillParagraph = document.createElement('p')
    skillParagraph.className = 'skill'
    skillParagraph.style.color = AppColors.WHITE
    skillParagraph.textContent = skill

    const wishesParagraph = document.createElement('p')
    wishesParagraph.className = 'wishes'
    wishesParagraph.style.color = AppColors.WHITE
    wishesParagraph.textContent = wishes

    item.appendChild(dateParagraph)
    item.appendChild(skillParagraph)
    item.appendChild(wishesParagraph)

    return item
  }

  const getOrCreateTooltip = (chart: Chart<'line'>) => {
    // Получаем ссылку на элемент tooltip, если он уже существует
    let tooltipEl = chart?.canvas?.parentNode?.querySelector('.container') as HTMLElement

    // Если элемент tooltip еще не существует, создаем его
    if (!tooltipEl) {
      // Создаем новый элемент tooltip
      tooltipEl = document.createElement('div')
      tooltipEl.className = 'container'
      tooltipEl.style.backgroundColor = AppColors.LIGHT_MOOD_BLACK_OPASITY_06
      tooltipEl.style.transition = 'all .1s ease-in-out'
      tooltipEl.style.borderRadius = '5px'
      tooltipEl.style.width = 'max-content'
      tooltipEl.style.padding = '5px'
      tooltipEl.style.position = 'absolute'
      tooltipEl.style.cursor = 'pointer'
      tooltipEl.style.pointerEvents = 'none'
      tooltipEl.style.zIndex = '500'

      // Создаем заголовок
      const title = document.createElement('h6')
      title.className = 'title'
      title.style.color = AppColors.WHITE
      tooltipEl.appendChild(title)

      // Создаем блок tooltip-info
      const tooltipInfo = document.createElement('div')
      tooltipInfo.className = 'tooltip-info'

      // Создаем блок tooltip-info-item
      const tooltipInfoItem = document.createElement('div')
      tooltipInfoItem.className = 'tooltip-info-item'

      // Создаем параграфы для даты, скилла и желаний
      const dateParagraph = document.createElement('p')
      dateParagraph.className = 'date'
      dateParagraph.style.color = AppColors.WHITE
      const skillParagraph = document.createElement('p')
      skillParagraph.className = 'skill'
      skillParagraph.style.color = AppColors.WHITE
      const wishesParagraph = document.createElement('p')
      wishesParagraph.className = 'wishes'
      wishesParagraph.style.color = AppColors.WHITE

      // Добавляем параграфы в блок tooltip-info-item
      tooltipInfoItem.appendChild(dateParagraph)
      tooltipInfoItem.appendChild(skillParagraph)
      tooltipInfoItem.appendChild(wishesParagraph)

      // Добавляем блок tooltip-info-item в блок tooltip-info
      tooltipInfo.appendChild(tooltipInfoItem)

      // Добавляем блок tooltip-info в элемент tooltip
      tooltipEl.appendChild(tooltipInfo)

      // Добавляем tooltip в DOM, в родительский элемент canvas
      chart?.canvas?.parentNode?.appendChild(tooltipEl)
    }

    // Создаем или получаем ссылки на элементы внутри tooltip
    const title = tooltipEl.querySelector('.title')
    // Возвращаем элемент tooltip и ссылки на внутренние элементы
    return { tooltipEl, title }
  }

  function externalTooltipHandler(context) {
    // Получаем элементы chart и tooltip из контекста
    const { chart, tooltip } = context
    // Получаем или создаем контейнер tooltip
    const { tooltipEl, title } = getOrCreateTooltip(chart)

    // Если tooltip не отображается, скрываем контейнер tooltip
    if (tooltip.opacity === 0 || !tooltip.dataPoints || !tooltip.dataPoints.length) {
      tooltipEl.style.opacity = '0'
      clearTooltipInfo(tooltipEl)
      return
    }

    const skillName = dataLineChart.value.yLabels[tooltip?.dataPoints[0]?.dataset?.label]
    const currentLevelOnAxis = tooltip.dataPoints[0].parsed.x
    const userHistory = tooltip.dataPoints[0].dataset.data.find(item => item?.x === currentLevelOnAxis)?.point

    // Последний подтвержденный уровень владения со статусом 'approved'
    const lastСonfirmedLevel = userHistory[0].TechnologyKnowledge.level
    // Первый подтвержденный уровень владения со статусом 'approved'
    const firstСonfirmedLevel = userHistory[userHistory.length - 1].TechnologyKnowledge.level
    // Дата последненго подтверждения уровеня владения со статусом 'approved'
    const lastСonfirmedLevelDate = userHistory[0].createdAt
    // Дата первого подтверждения уровеня владения со статусом 'approved'
    const firstСonfirmedLevelDate = userHistory[userHistory.length - 1].createdAt

    // Уровень желания в послденем подтвержденном уровне со статусом 'approved'
    const lastСonfirmedWishes = userHistory[0].TechnologyWish
    // Уровень желания в первом подтвержденном уровне со статусом 'approved'
    const firstСonfirmedWishes = userHistory[userHistory.length - 1].TechnologyWish

    title.textContent = `Skill: ${skillName}`

    if (tooltip.body) {
      if (userHistory.length === 1) {
        const itemData = {
          date: useDateFormat(lastСonfirmedLevelDate, 'DD.MM.YYYY').value,
          level: `Level: ${getLevelName(lastСonfirmedLevel, true)}`,
          wishes: `Wishes: [${lastСonfirmedWishes.level}] ${lastСonfirmedWishes.name}`,
        }
        const itemInfo = createTooltipInfoItem(itemData.date, itemData.level, itemData.wishes)

        tooltipEl.querySelector('.tooltip-info')?.appendChild(itemInfo)
      }

      if (userHistory.length === 2) {
        if (lastСonfirmedLevel === firstСonfirmedLevel) {
          const itemsData = [
            {
              date: useDateFormat(lastСonfirmedLevelDate, 'DD.MM.YYYY').value,
              skill: `Level: ${getLevelName(lastСonfirmedLevel, true)}`,
              wishes: `Wishes: [${lastСonfirmedWishes.level}] ${lastСonfirmedWishes.name}`,
            },
            {
              date: useDateFormat(firstСonfirmedLevelDate, 'DD.MM.YYYY').value,
              skill: `Level: ${getLevelName(firstСonfirmedLevel, true)}`,
              wishes: `Wishes: [${firstСonfirmedWishes.level}] ${firstСonfirmedWishes.name}`,
            },
          ]
          itemsData.forEach((itemData) => {
            const item = createTooltipInfoItem(itemData.date, itemData.skill, itemData.wishes)
            tooltipEl?.querySelector('.tooltip-info')?.appendChild(item)
          })
        }
        else {
          if (currentLevelOnAxis === firstСonfirmedLevel) {
            const itemData = {
              date: useDateFormat(firstСonfirmedLevelDate, 'DD.MM.YYYY').value,
              level: `Level: ${getLevelName(firstСonfirmedLevel, true)}`,
              wishes: `Wishes: [${firstСonfirmedWishes.level}] ${firstСonfirmedWishes.name}`,
            }
            const itemInfo = createTooltipInfoItem(itemData.date, itemData.level, itemData.wishes)

            tooltipEl?.querySelector('.tooltip-info')?.appendChild(itemInfo)
          }

          if (currentLevelOnAxis === lastСonfirmedLevel) {
            const itemData = {
              date: useDateFormat(lastСonfirmedLevelDate, 'DD.MM.YYYY').value,
              level: `Level: ${getLevelName(lastСonfirmedLevel, true)}`,
              wishes: `Wishes: [${lastСonfirmedWishes.level}] ${lastСonfirmedWishes.name}`,
            }
            const itemInfo = createTooltipInfoItem(itemData.date, itemData.level, itemData.wishes)

            tooltipEl?.querySelector('.tooltip-info')?.appendChild(itemInfo)
          }
        }
      }

      if (userHistory.length > 2) {
        const filteredHistory = userHistory.filter((history: UserTechnologyHistoriesModel) => history.TechnologyKnowledge.level === currentLevelOnAxis)

        filteredHistory.forEach((item: UserTechnologyHistoriesModel) => {
          const itemData = {
            date: useDateFormat(item.createdAt, 'DD.MM.YYYY').value,
            level: `Level: ${getLevelName(item.TechnologyKnowledge.level, true)}`,
            wishes: `Wishes: [${item.TechnologyWish.level}] ${item.TechnologyWish.name}`,
          }
          const itemInfo = createTooltipInfoItem(itemData.date, itemData.level, itemData.wishes)

          tooltipEl?.querySelector('.tooltip-info')?.appendChild(itemInfo)
        })
      }
    }

    tooltipEl.style.opacity = '1'

    // Определяем положение tooltip относительно канвы графика
    const positionX = chart.canvas.offsetLeft + tooltip.caretX
    const positionY = chart.canvas.offsetTop + tooltip.caretY

    // Определяем размеры окна просмотра
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight

    // Определяем ширину и высоту tooltip
    const tooltipWidth = tooltipEl.offsetWidth
    const tooltipHeight = tooltipEl.offsetHeight

    // Проверяем, выходит ли tooltip за пределы правого края экрана
    if (positionX + tooltipWidth > viewportWidth) {
      // Если выходит, сдвигаем tooltip влево
      tooltipEl.style.left = `${viewportWidth - tooltipWidth - 200}px`
    }
    else {
      // Если не выходит, устанавливаем его обычное положение
      tooltipEl.style.left = `${positionX - 100}px`
    }

    // Проверяем, выходит ли tooltip за пределы нижнего края экрана
    if (positionY + tooltipHeight > viewportHeight) {
      // Если выходит, сдвигаем tooltip вверх
      tooltipEl.style.top = `${viewportHeight - tooltipHeight}px`
    }
    else {
      // Если не выходит, устанавливаем его обычное положение
      tooltipEl.style.top = `${positionY}px`
    }
  }

  // опции
  const options = computed((): ChartOptions<'line'> => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      clip: false,
      elements: {
        point: {
          radius: getPointSize,
          backgroundColor: getPointColor,
          borderColor: getPointBorderColor,
          hoverRadius: 10,
          borderWidth: 3,
        },
      },
      scales: {
        x: {
          ticks: {
            callback(value: number) {
              return getLevelName(value)
            },
            color(context) {
              if (context.index === 1 && technologyHistoryStore.technologyTypeId === TabId.HARD)
                return AppColors.ERROR
              else
                return AppColors.LIGHT_MOOD_GRAY
            },
            padding: 10,
          },
          grid: {
            color(context) {
              if (context.index === 1 && technologyHistoryStore.technologyTypeId === TabId.HARD)
                return AppColors.ERROR
            },
            lineWidth(context) {
              if (context.index === 1 && technologyHistoryStore.technologyTypeId === TabId.HARD)
                return 3
            },
          },
          min: 1,
        },
        y: {
          display: true,
          position: 'left',
          clip: false,
          ticks: {
            stepSize: 1,
            callback(value, index: number) {
              const label = dataLineChart.value.yLabels[index]
              if (label?.length > 10)
                return `${label.substring(0, 10)}...`
              else
                return label
            },
            padding: 20,
          },
        },
        dateY: {
          display: true,
          position: 'right',
          ticks: {
            stepSize: 1,
            callback(value, index: number) {
              return dataLineChart.value.dateYLabels[index]
            },
            padding: 10,
          },
          grid: {
            drawOnChartArea: false,
            display: false,
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          enabled: false,
          external: externalTooltipHandler,
        },
      },
    }
  })

  // Функция для расчета/перерасчета высоты графика
  function initChart() {
    nextTick(() => {
      let height = 0
      const skillsCount = dataLineChart.value.skillCount
      if (skillsCount >= 1 && skillsCount <= 3)
        height = 150

      else if (skillsCount > 3 && skillsCount <= 5)
        height = (skillsCount * 55)

      else if (skillsCount > 5)
        height = (skillsCount * 40)

      heightChart.value = height
    })
  }

  function setIsOpenSkills(isOpen: boolean) {
    isOpenSkills.value = isOpen
  }

  return { dataLineChart, options, heightChart, isOpenSkills, setIsOpenSkills, initChart }
}
