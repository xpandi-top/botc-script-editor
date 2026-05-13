/**
 * makeT — lightweight typed translation helper.
 *
 * Usage:
 *   const t = makeT(language)
 *   t('save')  // → "Save" | "保存"
 *
 * Covers all ui.* keys from assets/locales/{en,zh}.json.
 * Falls back to the key string when a key is missing (never throws).
 */

import { locales } from '../catalog'
import type { Language } from '../types'

export type UiKey =
  | 'app_title' | 'app_lead' | 'print' | 'script_sheet' | 'settings'
  | 'all_characters' | 'new_script' | 'edit_script' | 'done_editing'
  | 'download_json' | 'no_scripts' | 'pdf_settings' | 'current_script'
  | 'font_size' | 'font_size_pt' | 'reset' | 'preview' | 'wake_order_toggle'
  | 'wake_order_note' | 'results_suffix' | 'total_suffix' | 'search_characters'
  | 'title' | 'chinese_title' | 'author' | 'bootlegger_rules'
  | 'bootlegger_rules_help' | 'bootlegger_rules_zh' | 'bootlegger_rules_zh_help'
  | 'bootlegger_rule_placeholder' | 'bootlegger_rule_zh_placeholder'
  | 'script_jinxes' | 'script_jinxes_help' | 'jinx_pair_id' | 'jinx_pair_placeholder'
  | 'jinx_status' | 'jinx_status_active' | 'jinx_status_inactive'
  | 'jinx_reason_en_placeholder' | 'jinx_reason_zh_placeholder' | 'jinxes'
  | 'add_jinx' | 'add_rule' | 'remove' | 'slug' | 'edition_label'
  | 'character_search' | 'filter_characters' | 'export' | 'language'
  | 'english' | 'chinese' | 'character_versions' | 'current_revision'
  | 'revision_history' | 'revision_note' | 'new_revision' | 'revision_id'
  | 'english_text' | 'chinese_text' | 'create_revision' | 'current'
  | 'no_character_selected' | 'available_characters' | 'selected_characters'
  | 'selected_count' | 'no_characters' | 'revision_created'
  | 'revision_id_required' | 'english_text_required' | 'chinese_text_required'
  | 'custom' | 'experimental' | 'huadeng' | 'huadengchushang' | 'shanyuyulai'
  | 'night_order' | 'tb' | 'snv' | 'bmr'
  | 'townsfolk' | 'outsider' | 'minion' | 'demon' | 'traveler' | 'fabled' | 'loric'
  | 'first_night' | 'other_nights'
  // Universal action verbs
  | 'save' | 'cancel' | 'close' | 'clear' | 'copy' | 'refresh' | 'exit' | 'upload'
  // Settings sections
  | 'theme' | 'font_preview' | 'interface_size' | 'english_fonts' | 'chinese_font'
  | 'backup_import' | 'export_everything' | 'import_bundle' | 'choose_json_file'
  | 'import_mode' | 'merge_keep_existing' | 'replace_overwrite'
  // Cloud sync
  | 'google_drive_sync' | 'sync_now' | 'disconnect' | 'connect_google_drive'
  | 'connected_google_drive' | 'sync_failed' | 'pulling_from_drive' | 'pushing_to_drive'
  // Analytics
  | 'analytics_title' | 'share_link' | 'generating' | 'link_copied'
  | 'import_to_my_records' | 'no_new_records'
  // Characters
  | 'new_custom_char' | 'team_label'

/**
 * Returns a `t(key)` function bound to the given language.
 * Inline ternaries like `zh ? '保存' : 'Save'` → `t('save')`.
 */
export function makeT(language: Language): (key: UiKey) => string {
  const dict = locales[language].ui as Record<string, string>
  return (key: UiKey): string => dict[key] ?? key
}
