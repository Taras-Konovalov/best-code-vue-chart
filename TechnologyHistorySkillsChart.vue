<script setup lang="ts">
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js'
import { Line } from 'vue-chartjs'
import { AppColors } from '~/enums/appEnum'

const technologyHistoryStore = useTechnologyHistoryStore()
const { t } = useI18n()
const { isDark } = useTheme()

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
)

const { dataLineChart, options, heightChart, isOpenSkills, setIsOpenSkills, initChart } = useTechnologyHistorySkillsChart()

onMounted(() => {
  initChart()
})

// Отслеживаем за измененияем количесвта скиллов и изменяем высотку графика
watch(() => dataLineChart.value.skillCount, () => {
  initChart()
})

// Если изменяется userId в фильтре, закрываем отображения всех скилов нового выбранного юзера и отображаем первые 5
watch(() => technologyHistoryStore.userId, () => {
  setIsOpenSkills(false)
})
</script>

<template>
  <v-card
    v-if="dataLineChart.skillCount"
    class="pr-5 mt-4 py-3 overflow-visible history-chart"
  >
    <div :style="{ height: `${heightChart}px` }">
      <Line
        :data="dataLineChart.data"
        :options="options"
      />
    </div>
    <v-btn
      v-if="technologyHistoryStore.getUsersSkillsByTypeIdAndSkillFilter.length > 5"
      class="mt-5 ml-2"
      :style="{ color: !isDark ? AppColors.DARK_BLUE : AppColors.WHITE }"
      @click="setIsOpenSkills(!isOpenSkills)"
    >
      {{
        !isOpenSkills
          ? `${t('pages.technology-history.button.all-skills')} (${dataLineChart.allSkills})`
          : `${t('pages.technology-history.button.latest-skills')} (5)`
      }}
    </v-btn>
  </v-card>
  <v-card v-else class="mt-3">
    <v-card-text class="text-center">
      {{ t('pages.technology-history.no-skills') }}
    </v-card-text>
  </v-card>
</template>

<style lang="scss" scoped>
.history-chart {
  z-index: auto;
}
</style>
