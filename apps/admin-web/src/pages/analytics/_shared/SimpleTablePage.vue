<script setup lang="ts">
type Field =
  | {
      type: "date-range";
      label: string;
      startPlaceholder: string;
      endPlaceholder: string;
      span: number;
    }
  | {
      type: "select";
      label: string;
      placeholder: string;
      value?: string;
      span: number;
    }
  | {
      type: "number-range";
      label: string;
      startPlaceholder: string;
      endPlaceholder: string;
      span: number;
    }
  | {
      type: "keyword";
      placeholder: string;
      span: number;
    }
  | {
      type: "actions";
      actions: ReadonlyArray<"search" | "reset">;
      span: number;
    };

type Column = {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  width?: string;
  minWidth?: string;
  nowrap?: boolean;
};

type Pagination = {
  total: number;
  pageSize: number;
  current: number;
  pages: ReadonlyArray<string | number>;
};

type Config = {
  title: string;
  filters: ReadonlyArray<ReadonlyArray<Field>>;
  bulkActionLabel?: string;
  columns: ReadonlyArray<Column>;
  rows: ReadonlyArray<Record<string, unknown>>;
  pagination?: Pagination;
  tableMinWidth?: number;
};

const props = defineProps<{
  config: Config;
  showToast: (message: string) => void;
}>();

function trigger(label: string) {
  props.showToast(`${label}为演示状态。`);
}

function getCell(row: Record<string, unknown>, key: string): any {
  return row[key];
}

function isRichCell(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && "type" in value;
}

function isAvatarCell(value: unknown): value is { type: string; avatar: string; primary: string; secondary?: string } {
  return isRichCell(value) && value.type === "avatar-name";
}

function isImageCell(value: unknown): value is { type: string; image: string; primary: string; secondary?: string } {
  return isRichCell(value) && value.type === "image-text";
}

function resolveCellKind(value: unknown) {
  if (isAvatarCell(value)) {
    return "avatar-name";
  }

  if (isImageCell(value)) {
    return "image-text";
  }

  return "plain";
}

function shouldNowrap(column: Column, value: unknown) {
  return column.nowrap || isAvatarCell(value) || isImageCell(value);
}

function getColumnStyle(column: Column) {
  const style: Record<string, string> = {};

  if (column.width) {
    style.width = column.width;
  }

  if (column.minWidth) {
    style.minWidth = column.minWidth;
  }

  return Object.keys(style).length > 0 ? style : undefined;
}

function getCellStyle(column: Column, value: unknown) {
  const style = (getColumnStyle(column) || {}) as Record<string, string>;

  if (!style.minWidth && isAvatarCell(value)) {
    style.minWidth = "220px";
  }

  if (!style.minWidth && isImageCell(value)) {
    style.minWidth = "360px";
  }

  return Object.keys(style).length > 0 ? style : undefined;
}
</script>

<template>
  <section class="analysis-page">
    <article class="analysis-card analysis-card--filter">
      <header class="analysis-heading">
        <span class="analysis-heading__accent"></span>
        <h1>{{ config.title }}</h1>
      </header>

      <div class="filter-stack">
        <div v-for="(row, rowIndex) in config.filters" :key="rowIndex" class="filter-row-grid">
          <template v-for="(field, fieldIndex) in row" :key="fieldIndex">
            <div v-if="field.type === 'date-range'" class="filter-field" :style="{ gridColumn: `span ${field.span}` }">
              <span class="filter-field__label">{{ field.label }}</span>
              <button class="filter-field__control filter-field__control--range" type="button" @click="trigger(field.label)">
                <span class="filter-field__input">{{ field.startPlaceholder }}</span>
                <span class="filter-field__divider">~</span>
                <span class="filter-field__input">{{ field.endPlaceholder }}</span>
                <svg class="filter-field__icon filter-field__icon--calendar" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                  <path d="M7 3v3M17 3v3M4 9h16M6 6h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
                </svg>
              </button>
            </div>

            <div v-else-if="field.type === 'select'" class="filter-field" :style="{ gridColumn: `span ${field.span}` }">
              <span class="filter-field__label">{{ field.label }}</span>
              <button class="filter-field__control" type="button" @click="trigger(field.label)">
                <span class="filter-field__input" :class="{ 'filter-field__input--strong': !!field.value }">
                  {{ field.value || field.placeholder }}
                </span>
                <span class="filter-field__icon filter-field__icon--chevron"></span>
              </button>
            </div>

            <div v-else-if="field.type === 'number-range'" class="filter-field" :style="{ gridColumn: `span ${field.span}` }">
              <span class="filter-field__label">{{ field.label }}</span>
              <div class="filter-field__control filter-field__control--range">
                <span class="filter-field__input">{{ field.startPlaceholder }}</span>
                <span class="filter-field__divider">-</span>
                <span class="filter-field__input">{{ field.endPlaceholder }}</span>
              </div>
            </div>

            <div v-else-if="field.type === 'keyword'" class="filter-field" :style="{ gridColumn: `span ${field.span}` }">
              <div class="filter-field__control">
                <span class="filter-field__input">{{ field.placeholder }}</span>
              </div>
            </div>

            <div v-else class="filter-field" :style="{ gridColumn: `span ${field.span}` }">
              <div class="filter-actions">
                <button
                  v-for="action in field.actions"
                  :key="action"
                  class="icon-button"
                  :class="{ 'icon-button--primary': action === 'search' }"
                  type="button"
                  @click="trigger(action === 'search' ? '搜索' : '重置')"
                >
                  <svg v-if="action === 'search'" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                    <circle cx="11" cy="11" r="7"></circle>
                    <path d="m20 20-3.6-3.6"></path>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                    <path d="M3 12a9 9 0 1 0 3-6.7"></path>
                    <path d="M3 3v6h6"></path>
                  </svg>
                </button>
              </div>
            </div>
          </template>
        </div>
      </div>
    </article>

    <article class="analysis-card analysis-card--content">
      <div v-if="config.bulkActionLabel" class="card-toolbar">
        <button class="card-toolbar__button" type="button" @click="trigger(config.bulkActionLabel)">
          {{ config.bulkActionLabel }}
        </button>
      </div>

      <div class="data-table">
        <div class="data-table__scroll">
          <table :style="config.tableMinWidth ? { minWidth: `${config.tableMinWidth}px` } : undefined">
            <colgroup>
              <col
                v-for="column in config.columns"
                :key="column.key"
                :style="column.width ? { width: column.width } : undefined"
              />
            </colgroup>
            <thead>
              <tr>
                <th
                  v-for="column in config.columns"
                  :key="column.key"
                  :data-align="column.align || 'left'"
                  :style="getColumnStyle(column)"
                >
                  {{ column.label }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, rowIndex) in config.rows" :key="rowIndex">
                <td
                  v-for="column in config.columns"
                  :key="column.key"
                  :data-align="column.align || 'left'"
                  :data-cell-kind="resolveCellKind(getCell(row, column.key))"
                  :data-nowrap="shouldNowrap(column, getCell(row, column.key)) ? 'true' : undefined"
                  :style="getCellStyle(column, getCell(row, column.key))"
                >
                  <template v-if="isAvatarCell(getCell(row, column.key))">
                    <div class="avatar-cell">
                      <img :src="getCell(row, column.key).avatar" :alt="getCell(row, column.key).primary" />
                      <div class="avatar-cell__text">
                        <strong>{{ getCell(row, column.key).primary }}</strong>
                        <span v-if="getCell(row, column.key).secondary">{{ getCell(row, column.key).secondary }}</span>
                      </div>
                    </div>
                  </template>

                  <template v-else-if="isImageCell(getCell(row, column.key))">
                    <div class="image-cell">
                      <img :src="getCell(row, column.key).image" :alt="getCell(row, column.key).primary" />
                      <div class="image-cell__text">
                        <strong>{{ getCell(row, column.key).primary }}</strong>
                        <span v-if="getCell(row, column.key).secondary">{{ getCell(row, column.key).secondary }}</span>
                      </div>
                    </div>
                  </template>

                  <template v-else>
                    {{ getCell(row, column.key) }}
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="config.pagination" class="pagination">
        <div class="pagination__summary">
          <span>共{{ config.pagination.total }}条</span>
          <span>每页{{ config.pagination.pageSize }}条</span>
        </div>

        <div class="pagination__controls">
          <button class="pagination__button" type="button" @click="trigger('上一页')">&lt;&lt;</button>
          <button class="pagination__button" type="button" @click="trigger('上一页')">&lt;</button>
          <button
            v-for="page in config.pagination.pages"
            :key="page"
            class="pagination__button"
            :class="{ 'pagination__button--active': page === config.pagination.current }"
            type="button"
            @click="trigger(`跳转到第${page}页`)"
          >
            {{ page }}
          </button>
          <button class="pagination__button" type="button" @click="trigger('下一页')">&gt;</button>
          <button class="pagination__button" type="button" @click="trigger('下一页')">&gt;&gt;</button>
          <div class="pagination__jump">
            <span>前往第</span>
            <input value="1" readonly />
            <span>页</span>
          </div>
        </div>
      </div>
    </article>
  </section>
</template>

<style scoped src="./analysis-ui.css"></style>

<style scoped>
.filter-field__icon--calendar {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
