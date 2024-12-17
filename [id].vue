<script setup lang="ts">
import { AppColors } from '~/enums/appEnum'
import { orderBtnActionList } from '~/enums/technologyHistoryEnum'

const { isDark } = useTheme()
const { t } = useI18n()

const technologyHistoryStore = useTechnologyHistoryStore()
const staffTechnologyStore = useAddStaffTechnology()
const userStore = useUserStore()
const skillStore = useSkillStore()

// текущий выбранный пользователь
const selectedUser = ref<number | null>(null)

onMounted(() => {
  // инициализация данных для страницы
  technologyHistoryStore.initData()
  skillStore.loadSkillsList()
})

watch(() => technologyHistoryStore.userId, () => {
  // следим за изменениями выбора сотрудника и добавляем его в стейт
  selectedUser.value = technologyHistoryStore.userId
})

// функция для обновления фильтра по скилам юзера
function updateSkillFilter(skills: number[]) {
  technologyHistoryStore.setSkillFilter(skills)
}
// функция для обновления фильтров по типу технологий (HARD, SOFT, TOOLS, LANG)
function updateTechnologyTypeIdFilter(typeId: number) {
  technologyHistoryStore.setTechnologyTypeId(typeId)
}
// функция для сортировки списка действий по дате(по возростанию, по убыванию)
function updateSortActionListFilter(order: string) {
  technologyHistoryStore.setSortActionList(order)
}
// функция для выбора юзера из списка сотрудников
function updateSelectedUser() {
  nextTick(() => {
    if (selectedUser.value) {
      technologyHistoryStore.setUserId(selectedUser.value)
      technologyHistoryStore.clearSkillFilter()
      technologyHistoryStore.loadUserSkills(selectedUser.value)
      technologyHistoryStore.updateRoute()
    }
  })
}

function isDisabledTypeIdBtn(typeId: number) {
  return !technologyHistoryStore.userSkills.some(skills => skills.Technology.type === typeId)
}

const isDisabledSortDateFilter = computed(() => {
  return !(technologyHistoryStore.skillFilter.length === 1 && technologyHistoryStore.getUsersSkillsByTypeIdAndSkillFilter[0].UserTechnologyHistories.length > 1)
})
</script>

<template>
  <div>
    <div class="d-flex align-center" style="gap: 16px;">
      <v-card
        style="max-width: 380px; width: 100%;"
        class="d-flex align-center justify-center py-3"
      >
        <v-btn-toggle
          v-model="technologyHistoryStore.technologyTypeId"
          mandatory
          style="height: 56px;"
          :selected-class="isDark ? 'active-tab-dark' : 'active-tab'"
          @update:model-value="updateTechnologyTypeIdFilter($event)"
        >
          <div
            v-if="technologyHistoryStore.getIsLoading"
            class="d-flex"
            style="gap: 16px"
          >
            <v-skeleton-loader
              v-for="technology in staffTechnologyStore.getTechnologyTypesList"
              :key="technology.id"
              type="button"
              height="56px"
              width="70px"
            />
          </div>
          <div v-else class="d-flex" style="gap: 16px">
            <v-btn
              v-for="technology in staffTechnologyStore.getTechnologyTypesList"
              :key="technology.id"
              :value="technology.id"
              :style="{
                border: `1px solid ${AppColors.BORDER_DEFAULT}`,
                color: !isDark ? AppColors.LIGHT_MOOD_FADE : '',
                borderRadius: '4px',
              }"
              :disabled="isDisabledTypeIdBtn(technology.id)"
            >
              {{ technology.type }}
            </v-btn>
          </div>
        </v-btn-toggle>
      </v-card>
      <v-card
        class="d-flex justify-center align-center pl-3 py-3"
        style="max-width: 100%; width: 100%; gap: 16px;"
      >
        <v-skeleton-loader
          v-if="technologyHistoryStore.getIsLoading"
          type="list-item"
          height="56px"
          width="100%"
        />
        <v-autocomplete
          v-else
          v-model="technologyHistoryStore.skillFilter"
          :items="technologyHistoryStore.getUserSkillsByTypeId"
          prepend-inner-icon="mdi-magnify"
          item-title="Technology.name"
          item-value="Technology.id"
          :label="t('pages.technology-history.skill')"
          chips
          closable-chips
          multiple
          variant="solo"
          clearable
          hide-details
          @update:model-value="updateSkillFilter($event)"
        >
          <template #chip="{ props, item }">
            <v-chip
              v-bind="props"
              :text="item.raw?.Technology?.name"
            />
          </template>
          <template #item="{ props, item }">
            <v-list-item
              v-bind="props"
              :subtitle="`ID: ${item.raw?.Technology?.id}`"
              :title="item.raw?.Technology?.name"
            />
          </template>
        </v-autocomplete>
        <v-skeleton-loader
          v-if="technologyHistoryStore.getIsLoading && userStore.getMyV1Role?.token !== 1"
          type="list-item"
          height="56px"
          width="100px"
        />
        <CustomUserFilter
          v-else-if="userStore.getMyV1Role?.token !== 1 && !technologyHistoryStore.getIsLoading"
          v-model="technologyHistoryStore.userId"
          :users-list="technologyHistoryStore.getUsersFilter"
          :label-text="t('components.bp-step-modify-dialog.label.employers')"
          :placeholder="t('components.bp-step-modify-dialog.placeholder.employers-add')"
          :show-role-icons="true"
          :multiple-select="false"
          :hide-details="true"
          variant="solo"
          density="default"
          item-value="userId"
          :dark="isDark"
          style="max-width: 290px; width: 100%;"
          @update-value="updateSelectedUser"
        />
        <v-btn-toggle
          v-model="technologyHistoryStore.sortActionList"
          mandatory
          style="height: 56px; min-width: 150px;"
          :selected-class="isDark ? 'order-active-tab-dark' : 'order-active-tab'"
          @update:model-value="updateSortActionListFilter($event)"
        >
          <div
            v-if="technologyHistoryStore.getIsLoading"
            class="d-flex"
            style="gap: 16px;"
          >
            <v-skeleton-loader
              v-for="order in orderBtnActionList"
              :key="order.value"
              type="button"
              width="70px"
              height="56px"
            />
          </div>
          <div v-else class="d-flex" style="gap: 16px;">
            <v-btn
              v-for="order in orderBtnActionList"
              :key="order.value"
              :value="order.value"
              :style="{
                border: `1px solid ${AppColors.BORDER_DEFAULT}`,
                color: !isDark ? AppColors.LIGHT_MOOD_FADE : '',
                borderRadius: '4px',
              }"
              :disabled="isDisabledSortDateFilter"
            >
              <v-icon>
                {{ order.icon }}
              </v-icon>
            </v-btn>
          </div>
        </v-btn-toggle>
      </v-card>
    </div>

    <TechnologyHistorySkillsChart />

    <TimeLineAction
      :tech="technologyHistoryStore.getUserSkillsByFilter"
      class="mt-4"
    />
  </div>
</template>

<style scoped>
.active-tab, .order-active-tab {
  border: 1px solid #2453B2 !important;
  background: #ffffff;
  color: #00339A !important;
}

.active-tab-dark, .order-active-tab-dark  {
  background-color: #112345;
  border: 1px solid #112345 !important;
}
</style>

<route lang="yaml">
name: technology-history
meta:
  layout: authorized
  containerFluid: true
  auth: true
  menu:
    show: false
    group: management
    name: technology-history
    icon: mdi mdi-account-convert
    sort: 7
  permissions:
    type: api
    values:
      - technology-history
      - usertechnologyGetTypes
      - usertechnologyGetKnowledge
</route>
