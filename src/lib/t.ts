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
  | 'theme' | 'theme_system' | 'theme_system_sub'
  | 'font_preview' | 'interface_size' | 'english_fonts' | 'chinese_font'
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
  // Storyteller settings
  | 'storyteller_settings' | 'default_st_name' | 'default_st_name_help'
  // Inline action labels
  | 'edit' | 'delete' | 'add' | 'active' | 'inactive' | 'modified'
  | 'set_active' | 'set_inactive' | 'clear_overrides'
  | 'no_rule_text' | 'rule_en' | 'rule_zh'
  | 'character_a' | 'character_b' | 'character_a_placeholder' | 'character_b_placeholder'
  | 'invalid_file_format' | 'advanced' | 'list_is_empty' | 'append_to_end'
  | 'reset_to_default' | 'download_as_json' | 'drag_reorder_hint' | 'search_and_add_char'
  | 'jinx_manager' | 'import_jinxes_json' | 'export_jinxes_json' | 'new_jinx_pair'
  | 'jinx_export_hint' | 'download_character_json' | 'author_label' | 'add_revision'
  | 'ability_text_en' | 'ability_text_zh' | 'ability_text_zh_optional'
  | 'change_note_optional' | 'change_note_placeholder' | 'set_as_current_revision'
  | 'revision_id_hint' | 'current_short' | 'swap_ab_hint' | 'jinx_in_db'
  | 'canonical_prefix' | 'override_reason_en' | 'override_reason_zh'
  | 'script_info_section' | 'unknown_char_ids' | 'create_custom' | 'script_notes'
  | 'has_content' | 'st_notes_placeholder' | 'no_custom_jinxes' | 'characters_section'
  | 'import_failed_json' | 'cleared_pack_overrides' | 'import_failed_char_json'
  | 'confirm_delete_char' | 'add_char_from_json' | 'pack_active'
  | 'custom_edition_suffix' | 'import_pack' | 'download_pack'
  | 'name_en' | 'name_zh_optional' | 'icon_optional' | 'choose_image'
  | 'first_night_wake_pos' | 'other_nights_wake_pos'
  | 'first_night_reminder' | 'other_night_reminder'
  | 'reminder_tokens' | 'reminder_tokens_hint'
  | 'reminder_tokens_global' | 'reminder_tokens_global_hint'
  // BotC game terms — used in Storyteller Helper
  | 'execution' | 'nomination' | 'vote' | 'votes' | 'alive' | 'dead'
  | 'drunk' | 'poisoned' | 'demon_bluffs' | 'grimoire'
  | 'day_phase' | 'night_phase'
  | 'st_only' | 'public' | 'st_tag' | 'public_tag'
  | 'add_st_tag' | 'add_public_tag' | 'remove_st_tag' | 'remove_public_tag'
  | 'event_log' | 'game_log' | 'game_records' | 'new_game' | 'game_setup'
  | 'end_game_results' | 'save_checkpoint' | 'checkpoint_name_prompt'
  | 'save_checkpoint_hint' | 'full_restore' | 'partial_restore'
  | 'mark_dead' | 'set_no_vote' | 'change_character' | 'change_status'
  | 'use_day_ability' | 'day_ability' | 'exile' | 'random_pool' | 'clear_pool'
  | 'traveler_assignments' | 'perceived_character' | 'actual_character'
  | 'demon_bluffs_unset' | 'no_events' | 'vote_hint'
  | 'skill_history' | 'vote_history' | 'random_fill_hint'
  | 'rename' | 'rename_overwrite' | 'download_log_json'
  | 'st_private_notes' | 'quick_add_note' | 'player_note' | 'traveler_note'
  | 'record_name_optional' | 'no_votes' | 'good_wins' | 'evil_wins' | 'st_wins'
  | 'diff_type' | 'diff_team' | 'same_type' | 'same_team' | 'search_records'
  | 'storyteller_name' | 'enter_st_name' | 'stop_bgm' | 'play_bgm'
  | 'add_local_audio' | 'add_url_audio' | 'track_name_placeholder' | 'paste_audio_url'
  | 'timer_defaults' | 'seat_info'
  // Storyteller extra labels
  | 'info' | 'info_text' | 'true_label' | 'false_label' | 'true_false'
  | 'public_short' | 'good_short' | 'evil_short'
  | 'select_pick' | 'select_traveler' | 'none_assigned' | 'confirm_yes'
  | 'night_st_status' | 'all_days' | 'day_short' | 'ability_short'
  | 'vote_short' | 'vote_count' | 'win_short' | 'result'
  | 'calculated' | 'actual_short' | 'change_to' | 'n_games_suffix'
  | 'restore_alive' | 'about_to_die'
  | 'select_script_first' | 'enter_new_filename' | 'script'
  | 'note_optional' | 'note_placeholder' | 'edit_players'
  | 'drunk_tag' | 'poisoned_tag' | 'protected_tag' | 'used_tag' | 'red_herring'

export type TplKey =
  | 'showing_n_of_m'
  | 'first_night_count'
  | 'other_nights_count'
  | 'jinxes_n'
  | 'add_revision_for'
  | 'imported_n_chars'
  | 'updated_character'
  | 'added_character'
  | 'edit_char_title'
  // Storyteller template keys
  | 'day_n'
  | 'delete_day_n'
  | 'n_records'
  | 'random_pool_n'
  | 'required_votes'
  | 'votes_progress'

/**
 * Returns a `t(key)` function bound to the given language.
 * Inline ternaries like `zh ? '保存' : 'Save'` → `t('save')`.
 */
export function makeT(language: Language): (key: UiKey) => string {
  const dict = locales[language].ui as Record<string, string>
  return (key: UiKey): string => dict[key] ?? key
}

/**
 * Returns a `tpl(key, ...args)` function bound to the given language.
 * Replaces `{0}`, `{1}`, etc. with the provided arguments.
 * Example: tpl('showing_n_of_m', 5, 100) → "Showing 5 of 100"
 */
export function makeTpl(language: Language): (key: TplKey, ...args: (string | number)[]) => string {
  const dict = locales[language].ui as Record<string, string>
  return (key: TplKey, ...args: (string | number)[]): string => {
    const template = dict[key] ?? key
    return template.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ''))
  }
}
