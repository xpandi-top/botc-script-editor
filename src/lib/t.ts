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
  | 'custom' | 'experimental' | 'huadeng' | 'huadengchushang' | 'shanyuyulai' | 'odyssey'
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
  | 'checkpoint_name_placeholder' | 'save_checkpoint_hint' | 'full_restore' | 'partial_restore'
  | 'mark_dead' | 'set_no_vote' | 'change_character' | 'change_status'
  | 'use_day_ability' | 'day_ability' | 'exile' | 'random_pool' | 'clear_pool'
  | 'traveler_assignments' | 'perceived_character' | 'actual_character'
  | 'demon_bluffs_unset' | 'no_events' | 'vote_hint' | 'vote_history' | 'random_fill_hint'
  | 'rename' | 'rename_overwrite' | 'download_log_json'
  | 'st_private_notes' | 'quick_add_note' | 'player_note' | 'traveler_note'
  | 'record_name_optional' | 'no_votes' | 'good_wins' | 'evil_wins' | 'st_wins'
  | 'diff_type' | 'diff_team' | 'same_type' | 'same_team' | 'search_records'
  | 'storyteller_name' | 'enter_st_name' | 'stop_bgm' | 'play_bgm'
  | 'add_local_audio' | 'add_url_audio' | 'track_name_label' | 'track_name_placeholder' | 'paste_audio_url'
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
  // Merged from i18n/index.ts (Storyteller-specific strings)
  | 'eyebrow' | 'player_count' | 'control_console' | 'game_actions'
  | 'private_chat' | 'public_chat' | 'free_speech' | 'round_robin_mode'
  | 'choose_speaker' | 'random_speaker' | 'next_speaker'
  | 'start' | 'reset_timer' | 'end_now' | 'alarm_sound'
  | 'add_tag' | 'start_nomination' | 'continue_public' | 'record_done'
  | 'actor' | 'target' | 'voters' | 'non_voters'
  | 'note' | 'statement' | 'skill_actor' | 'skill_role' | 'skill_target'
  | 'success' | 'failure' | 'alive_tag' | 'executed_tag' | 'no_vote_tag'
  | 'tag_pool' | 'clear_unused_tags' | 'open_settings' | 'close_settings'
  | 'selected_player' | 'reset_names' | 'restart_game' | 'end_game'
  | 'private_default' | 'public_free_default' | 'public_round_robin_default'
  | 'seat_hint' | 'vote_trail' | 'skill_trail' | 'session_log'
  | 'completed_games' | 'no_completed_games'
  | 'system_override_pass' | 'system_override_fail' | 'clear_override'
  | 'pass' | 'fail' | 'confirm' | 'restart_title' | 'end_game_title' | 'vote_title'
  | 'waiting_for_nomination' | 'actor_speaking' | 'target_speaking'
  | 'ready_to_vote' | 'voting' | 'voting_done' | 'vote_yes'
  | 'start_voting' | 'pick_nominator' | 'pick_nominee'
  | 'use_skill' | 'save_skill' | 'cancel_skill' | 'target_note'
  | 'bgm' | 'play' | 'pause' | 'loop'
  | 'nomination_gate' | 'nomination_available'
  | 'nomination_delay_default' | 'nomination_wait_default'
  | 'actor_speech_default' | 'target_speech_default' | 'vote_default'
  | 'record_vote' | 'current_voter'
  | 'nomination_succeed' | 'nomination_failed' | 'skip_voting' | 'continue_nomination'
  | 'phase_before_private' | 'phase_during_private'
  | 'phase_before_public' | 'phase_during_public' | 'phase_during_nomination'
  | 'game_section' | 'day_section' | 'player_section' | 'bgm_section'
  | 'save_before_new_game_title' | 'save_before_new_game_body'
  | 'save_and_new' | 'discard_and_new' | 'start_new_game' | 'confirm_end'
  | 'distribution' | 'random_assign' | 'show_assign' | 'hide_assign'
  | 'winner' | 'evil' | 'good' | 'player_team' | 'player_notes'
  | 'review_mode_label' | 'edit_mode' | 'add_traveler'
  | 'player_pool' | 'load_fake_names' | 'assign_name'
  | 'single_loop' | 'loop_all' | 'aggregated_log'
  | 'filter_vote' | 'filter_skill' | 'filter_event'
  | 'sort_asc' | 'sort_desc' | 'export_json' | 'import_game'
  | 'cancel_new_game' | 'show_log' | 'hide_log' | 'show_panel' | 'hide_panel'
  | 'alive_count' | 'total_count' | 'highest_vote' | 'leading_candidate'
  | 'quick_nomination' | 'quick_skill' | 'next_day'
  | 'seat_assignment' | 'unassigned' | 'click_to_assign'
  | 'load_local_file' | 'remove_from_seat' | 'load_preset'
  | 'tag_settings' | 'default_tags' | 'load_predefined_tags' | 'add_tag_label'
  | 'travelers_count' | 'load_custom_alarm'
  | 'share_log' | 'share_log_copied' | 'quick_add_log' | 'game_log_title'
  // AI context / utility keys
  | 'new_character' | 'team_role' | 'current_fields' | 'night_info' | 'empty' | 'name_zh' | 'ability_en' | 'ability_zh'
  | 'first_night_order' | 'first_night_reminder_2' | 'other_night_order' | 'other_night_reminder_2'
  | 'author_2' | 'edition' | 'total_characters' | 'notes'
  | 'script_title' | 'character_count' | 'team_breakdown'
  | 'none' | 'passed' | 'failed'
  | 'storyteller' | 'current_day' | 'total_days' | 'alive_players' | 'dead_players' | 'recent_votes'
  | 'day' | 'days' | 'days_played' | 'final_alive' | 'dead_2' | 'demon_bluffs_2'
  | 'alive_2' | 'events' | 'full_log' | 'recent_scripts' | 'game_analytics' | 'general'
  | 'exile_2'
  // ScriptsTab keys
  | 'hide_night_order' | 'show_night_order' | 'single_column' | 'two_columns'
  | 'show_ability_text' | 'hide_ability_text' | 'lang' | 'print_pdf'
  | 'custom_tag' | 'collapse' | 'add_note' | 'script_notes_for_your_own_reference' | 'share_script' | 'generating_link' | 'copy_link'
  // Tutorial keys
  | 'tutorial' | 'skip' | 'back' | 'done' | 'next' | 'phase'
  // ScriptsTab extra
  | 'short_link_failed_using_direct_link_instead' | 'back_to_card_view' | 'copy_share_link'
  // SettingsTab extra
  | 'light' | 'parchment' | 'dark' | 'crimson'
  | 'scales_all_ui_text_spacing_and_controls_uniformly'
  | 'chinese_font_applies_to_both_body_text_and_titles'
  | 'import_successful_reload_the_page_to_apply'
  // AnalyticsTab extra
  | 'export_records_json' | 'export_analysis_json' | 'export_stats_csv'
  | 'share' | 'copy_share_link_interactive' | 'share_as_png' | 'share_as_pdf'
  | 'import_json' | 'import_error'
  // CharactersTab PackImportDialog extra
  | 'import_character_pack' | 'all' | 'new' | 'update' | 'dirty_id'
  | 'character_id_unique_key' | 'only_lowercase_letters_digits'
  | 'duplicate_id_within_this_pack' | 'custom_character_with_this_id_already_exists'
  | 'suggested' | 'apply' | 'setup' | 'other_night'
  | 'leave_empty_imported' | 'reminder_tokens_commaseparated'
  | 'eg_wrong_drunk' | 'tokens_placed_on_other_players'
  | 'global_reminder_tokens_commaseparated' | 'eg_no_ability'
  | 'tokens_available_on_all_seats' | 'icon_image_url'
  | 'preview_on_right' | 'leave_empty_for_placeholder'
  // Remaining keys from bulk migration
  // Final remaining keys
  | 'add_folder' | 'add_script' | 'autogenerated_from_script_date_if_blank' | 'changelog' | 'new_features' | 'latest_release' | 'view_changelog' | 'expand_release' | 'collapse_release' | 'character' | 'characters_played' | 'chat'
  | 'create_record' | 'custom_rules' | 'custom_rules_settings' | 'delete_this_day'
  | 'edit_characters' | 'edit_game_record' | 'eg_custom_rules_script_variants_house_rules'
  | 'evil_win' | 'frequent_teammates' | 'game_survey' | 'games_ended_on_day' | 'good_win'
  | 'hide_wake_order' | 'house_rules_variants' | 'log' | 'mvp'
  | 'new_game_record' | 'nominate' | 'other_notes' | 'player_list' | 'previous_day'
  | 'quick_edit' | 'show_wake_order' | 'st_games' | 'st_name' | 'st_win' | 'survey_st' | 'who_ran_this_game'
  // More missing keys from remaining errors
  | '1_col' | '2_col' | 'active_players' | 'alignment' | 'alphabetical' | 'balanced_win_rates' | 'bluffs' | 'body' | 'card_outline' | 'chinese_2' | 'chip' | 'columns' | 'common_characters' | 'compact' | 'configure_tags_to_see_preview' | 'consider_harder_evil_roles' | 'consider_more_goodfavoured_scripts' | 'demon_2' | 'english_font' | 'evil_games' | 'evil_rate' | 'evil_w' | 'evildominant' | 'exec' | 'exporting' | 'games' | 'good_games' | 'good_w' | 'gooddominant' | 'hide_menu' | 'icon_outer_circle' | 'icons' | 'in_scripts' | 'inline' | 'insert_character_after_this' | 'last_10_games' | 'layout' | 'left' | 'line' | 'min' | 'minion_2' | 'mixed' | 'most_played' | 'n' | 'noms' | 'normal' | 'outsider_2' | 'page' | 'page_1_end' | 'perday_averages' | 'player_comparison' | 'players_who_played_this' | 'preview_actual_print_may_differ_slightly' | 'print_preview' | 'print_studio' | 'recent_appearances' | 'right' | 's' | 'script_pdf' | 'search_character' | 'section' | 'section_style' | 'select_characters_on_the_left' | 'separate' | 'show_author' | 'show_menu' | 'side' | 'spacing' | 'spacious' | 'st' | 'switch_to_script_print_preview' | 'times_used_as_demon_bluff' | 'toggle_language' | 'tokens' | 'typography' | 'unique_chars' | 'used_as_demon_bluff' | 'wake_order' | 'win_rate' | 'zh'
  | '1_wake_first' | 'ability' | 'ability_size' | 'add_marker' | 'ai_assistant' | 'all_scripts' | 'anon' | 'anonymous' | 'apply_start_game' | 'arc' | 'ask_the_storyteller_for_a_new_link' | 'attributes' | 'autoapply_fills' | 'avg_days' | 'avg_min' | 'avg_players' | 'avg_ratings' | 'background' | 'balanced' | 'bg_color' | 'black_white' | 'blood_on_the_clocktower_deal' | 'border' | 'both' | 'bottom' | 'bright' | 'center' | 'change' | 'change_image' | 'character_hidden' | 'character_hidden_compact' | 'character_hidden_help' | 'character_markers' | 'characters' | 'chars' | 'check_network_or_reconnect' | 'chinese_body' | 'circle' | 'claimed' | 'clear_chat' | 'click_to_rename' | 'close_deal_no_more_claims' | 'closed' | 'color' | 'community' | 'compare' | 'configure_your_own_google_oauth2_credentials' | 'confirm_delete' | 'connection_failed' | 'contain' | 'copied' | 'copy_player_link' | 'copy_to_diy' | 'could_not_claim_that_card_please_try_again' | 'cover' | 'create' | 'custom_tags' | 'data_stored_privately_in_your_google_drive' | 'date' | 'deal_dashboard' | 'dealing_closed' | 'delete_folder' | 'delete_selected' | 'delete_this_record' | 'demon_info' | 'diy' | 'e' | 'empty_folder' | 'en_font' | 'enable_watermark' | 'english_body' | 'english_title' | 'error' | 'evil_2' | 'evil_rate_of_games_played_as_evil' | 'exp' | 'export_markdown' | 'export_selected' | 'filter' | 'filtered' | 'first' | 'first_night_en' | 'first_night_reminder_en' | 'first_night_reminder_zh' | 'first_night_zh' | 'fit' | 'folder_name' | 'from' | 'fun_evil' | 'fun_good' | 'evil_abbrev' | 'g' | 'games_g' | 'general_ai_assistant' | 'good_abbrev' | 'global_tokens_all_seats' | 'hex' | 'hide_abilities' | 'hide_characters' | 'hide_reminders' | 'icon' | 'icon_size' | 'image' | 'insights' | 'label' | 'label_optional' | 'link_expired' | 'loading' | 'markers' | 'minion_info' | 'mode' | 'more' | 'most_played_characters' | 'move_to_folder' | 'mvp_count' | 'name' | 'name_size' | 'new_folder' | 'new_record' | 'night_reminders' | 'no_community_scripts' | 'no_matches' | 'no_night_reminders_for_this_character' | 'no_night_wake' | 'no_night_wakeup' | 'no_player_data_add_player_names_to_game_records' | 'no_records_match_the_current_filter' | 'no_script_data' | 'no_wakeup' | 'number_size' | 'numbers' | 'official' | 'open_cloud_console' | 'other' | 'other_nights_en' | 'other_nights_reminder_en' | 'other_nights_reminder_zh' | 'other_nights_zh' | 'otherseat_tokens' | 'output' | 'p' | 'page_size' | 'pick_your_character_card' | 'player_name' | 'players' | 'position' | 'qty' | 'record' | 'remember_your_character' | 'reminder_tokens_2' | 'remove_from_folder' | 'rename_folder' | 'replay' | 'reset_filters' | 'retry' | 'save_both_client_id_and_client_secret_above_first' | 'saved_keep_your_character_secret' | 'saved_register_this_redirect_uri_in_cloud_console' | 'script_summary' | 'scripts' | 'search_characters_2' | 'search_scripts_author_characters' | 'seat' | 'seat_optional' | 'selected' | 'set_claimed' | 'set_unclaimed' | 'setup_indicators' | 'shape' | 'shape_size' | 'show_abilities' | 'show_characters' | 'show_reminders' | 'square' | 'st_games_run' | 'storytellers' | 'straight' | 'stretch' | 'style' | 'switch_to_list_view' | 'tag_type' | 'tap_one_card_to_flip_it_others_will_lock' | 'tap_to_flip' | 'text' | 'that_card_was_already_claimed_pick_another_card' | 'the_storyteller_has_closed_this_deal_session' | 'thinking' | 'to' | 'tokens_this_character_places_on_other_players' | 'top_5_players' | 'total_games' | 'type_a_message_enter_to_send' | 'uncategorized' | 'unclaimed' | 'undo' | 'upload_image' | 'view_cards' | 'w' | 'wake_first' | 'wake_order_indicators' | 'watermark_optional' | 'watermark_text' | 'win_balance' | 'your_character' | 'your_name_optional' | 'zh_font'
  | 'most_recent_consecutive_results' | 'games_running_long' | 'healthy_game_pace'
  | 'switch_to_card_view' | 'search_title_author_character' | 'default'
  | 'field_required'
  | 'name_az' | 'char_count' | 'copy_a_script_above_to_start'
  | 'none_yet' | 'today_nominators' | 'today_nominees' | 'nominations'
  | 'no_events_found_for_this_player' | 'skill' | 'tag' | 'state'
  | 'paste_names_separated_by_commas'
  | 'no_entries'
  | 'disclaimer'
  | 'tab_desc_scripts' | 'tab_desc_characters' | 'tab_desc_storyteller'
  | 'tab_desc_analytics' | 'tab_desc_printstudio' | 'tab_desc_settings'
  | 'eg_dimo' | 'fabled_loric' | 'none_selected' | 'special_note' | 'apply_changes'
  | 'add_all' | 'alice_bob_charlie'
  | 'assign' | 'auto' | 'batch_load' | 'charactersseatsteams'
  | 'click_a_seat_on_the_table_to_select' | 'click_to_add_custom_rules'
  | 'click_to_load' | 'click_to_load_this_game' | 'close_char_picker'
  | 'commaseparated_tags' | 'countdown_settings'
  | 'deal_assigned_characters_to_players_new_tab' | 'deal_cards'
  | 'default_bgm' | 'default_track' | 'ended' | 'enter_custom_rules' | 'expand'
  | 'file_name' | 'fill' | 'finished' | 'fun_for_evil' | 'fun_for_good'
  | 'game_end_survey' | 'guess' | 'is_it_balanced' | 'know'
  | 'night_ability' | 'not_finished'
  | 'open_active_deal_dashboard' | 'optional_note' | 'override'
  | 'phase_switch_sound' | 'pick_by_character' | 'random' | 'remove_novote'
  | 'replay_this_script' | 'save_record' | 'saved'
  | 'script_reminders' | 'search' | 'select' | 'select_player'
  | 'storyteller_setup' | 'teams' | 'this_game_only' | 'traveler_2'
  | 'type' | 'type_custom_or_pick_reminder' | 'update_all'
  | 'update_saved_records' | 'upload_custom_sound' | 'upload_local_bgm'
  | 'your_name_as_storyteller' | 'pub'
  // Cloud sync
  | 'cloud_sync_not_configured' | 'cloud_sync_enter_client_id'
  | 'not_connected_google_drive' | 'click_to_go_to_settings'
  | 'sync_error' | 'unknown_error' | 'syncing' | 'not_yet_synced'
  // App navigation
  | 'storyteller_helper' | 'feedback' | 'hide_description' | 'show_description'
  | 'tab_st_short' | 'tab_stats_short' | 'tab_print_short'
  | 'ai_assistant_experimental' | 'exp_short'
  // Script sheet / characters
  | 'leave_blank_autogenerate' | 'author_prefix' | 'characters_suffix'
  | 'sheet_first_night' | 'sheet_other_nights'
  | 'first_night_pick_position' | 'other_nights_pick_position'
  | 'view_note'
  | 'version' | 'new_badge' | 'pack_badge' | 'yes_short' | 'no_short'
  // Arena UI legend
  | 'arena_st_setup' | 'arena_nominations' | 'arena_edit_roles' | 'arena_tap_seat'
  // Communication board
  | 'communication_board' | 'communication_text' | 'communication_draw'
  | 'communication_empty_hint' | 'communication_custom_text' | 'communication_add_hint'
  | 'communication_select_character' | 'communication_multiselect_suffix'
  | 'communication_pen' | 'communication_eraser' | 'communication_custom_color'
  | 'communication_stroke_size' | 'communication_clear_board'
  | 'communication_phrase_ability_tonight' | 'communication_phrase_chat_tomorrow'
  | 'communication_phrase_choose_ability' | 'communication_phrase_meet_minions'
  | 'communication_phrase_you_good' | 'communication_phrase_you_evil'
  | 'communication_phrase_char_in_play' | 'communication_phrase_char_not_in_play'
  | 'communication_phrase_same_team' | 'communication_phrase_diff_team'
  | 'communication_phrase_mistake' | 'communication_phrase_eyes_open'
  | 'communication_phrase_wake_up' | 'communication_phrase_go_to_sleep'
  | 'communication_phrase_shake_head' | 'communication_phrase_choose_n_players'
  | 'communication_phrase_choose_n_chars' | 'communication_phrase_you_are_char'
  | 'communication_phrase_char_is_char'
  // ── Language toggle semantic aliases (old: str_en, zh, en) ────────────────
  | 'lang_switch'    // the toggle button label (EN locale: "中", ZH locale: "EN")
  | 'lang_current'   // current language label ("English" | "中文")
  // ── BOTC terminology namespace (term_* prefix) ─────────────────────────────
  | 'term_townsfolk' | 'term_outsider' | 'term_minion' | 'term_demon'
  | 'term_traveler'  | 'term_fabled'   | 'term_storyteller' | 'term_ability'
  | 'term_nomination' | 'term_execution' | 'term_drunk' | 'term_poisoned'
  | 'term_alive'     | 'term_dead'     | 'term_first_night' | 'term_other_nights'
  | 'term_register_as' | 'term_grimoire'
  // ── Phase labels and phase-state aliases ──────────────────────────────────
  | 'phase_night' | 'phase_day' | 'phase_private' | 'phase_public' | 'phase_nomination'
  | 'phase_private_before' | 'phase_private_during'
  | 'phase_public_before' | 'phase_public_during' | 'phase_nomination_during'
  | 'first_night_order_label' | 'other_night_order_label'
  | 'first_night_reminder_label' | 'other_night_reminder_label'
  | 'current_day_label'
  // ── AI namespace (ai_* prefix) ────────────────────────────────────────────
  | 'ai_chat' | 'ai_skills' | 'ai_log' | 'ai_settings'
  | 'ai_thinking' | 'ai_clear_chat' | 'ai_auto_apply'
  | 'ai_local_model' | 'ai_api_key_mode' | 'ai_provider' | 'ai_model'
  | 'ai_context' | 'ai_no_fills' | 'ai_run_skill' | 'ai_type_hint'
  | 'ai_skills_context'
  // ── New keys (replacing deprecated keys removed from JSON) ────────────────
  | 'ability_history'     // replaces skill_history
  | 'ability_user'        // replaces skill_actor
  | 'ability_target'      // replaces skill_target
  | 'ability_log'         // replaces skill_trail
  | 'use_ability'         // replaces use_skill
  | 'filter_ability'      // replaces filter_skill
  | 'quick_ability'       // replaces quick_skill
  | 'ability_label'       // replaces skill_2
  | 'abilities_used'      // replaces skills_used (AI context serialization)
  | 'abilities'           // replaces skills (stats column header)
  | 'ai_skills_context_label' // replaces skills_for_other_contexts
  | 'game_records_label'  // replaces records (ST console tab label)
  | 'game_records_saved'  // replaces saved_games
  | 'demon_bluffs_label'  // replaces demo_bluffs_2
  | 'vote_label'          // replaces vote_2 (lowercase event type label)
  | 'next_day_label'      // replaces next_day_2
  | 'no_game_active'      // empty state: no game in progress
  | 'tap_menu_to_start'   // empty state: hint to open menu
  // ── Semantic aliases for truncated/long keys ──────────────────────────────
  | 'settings_theme_desc' | 'settings_font_persist_note'
  | 'backup_export_desc'
  | 'share_link_permanent_note' | 'share_link_24h_note'
  | 'gdrive_redirect_note' | 'gdrive_add_uri_note'
  | 'gdrive_preconfigured_note' | 'gdrive_appdatafolder_note' | 'gdrive_connect_desc'
  | 'analytics_char_team_hint' | 'analytics_no_char_data' | 'analytics_no_records_hint'
  | 'scripts_empty_hint' | 'delete_day_confirm'
  | 'char_unsaved_note' | 'search_id_name_desc' | 'tokens_all_seats_note'

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
  | 'seat_event_log'
  // Additional template keys
  | 'last_synced_time'
  | 'section_n'
  | 'preview_px_mm'
  | 'line_height_val'
  | 'card_icon_px'
  | 'wake_icon_px'
  | 'pos_after'
  | 'insert_after'
  | 'player_entered_seat'
  | 'seat_n'
  | 'n_new_chars'
  | 'n_overrides_count'
  | 'import_n'
  | 'avg_days_n'
  | 'avg_votes_n'
  | 'avg_noms_n'
  | 'exec_rate_n'
  | 'showing_n_games_of_m'
  | 'ratings_n'
  | 'apply_names_to_all_n_days'
  | 'rename_player_in_n_records'
  | 'n_cards_tap_one'
  | 'seats_ready_n_of_m'
  | 'pack_n_chars_selected'
  | 'day_compact'
  | 'records_n'
  | 'confirm_delete_n_records'
  | 'good_n_games'
  | 'evil_n_games'
  | 'player_selected_compare'
  | 'setup_label'
  | 'first_night_pos'
  | 'other_nights_pos'
  // TokenOptionsPanel
  | 'diameter_mm' | 'gap_mm' | 'margin_mm' | 'border_width_px'
  | 'watermark_size_pt' | 'watermark_opacity_pct'
  // OverviewSection win counts
  | 'evil_pct_label' | 'good_pct_label' | 'evil_vs_good_pct'
  | 'evil_wins_n' | 'good_wins_n' | 'st_wins_n'
  // OverviewSection insight labels
  | 'streak_n_side' | 'evil_heavy_label' | 'evil_wins_pct_of_n'
  | 'good_friendly_label' | 'good_wins_pct_of_n' | 'top_rated_label'
  | 'avg_balance_replay' | 'player_leads_winrate' | 'player_stats_detail'
  | 'player_low_winrate' | 'player_check_roles'
  | 'char_most_played_label' | 'char_played_winrate'
  | 'player_top_mvp_label' | 'player_mvp_count'
  | 'player_most_active_st' | 'avg_duration_min'
  | 'more_n_scripts_tab' | 'more_n_storytellers'
  // Misc templates
  | 'open_session' | 'script_chars_short' | 'log_tab_n' | 'fill_log_n'
  | 'context_editing' | 'tag_for_char'
  | 'st_detail_n_games_scripts'
  // Communication board templates
  | 'communication_phrase_char_in_play' | 'communication_phrase_char_not_in_play'
  | 'communication_phrase_choose_n_players' | 'communication_phrase_choose_n_chars'
  | 'communication_phrase_you_are_char' | 'communication_phrase_char_is_char'

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
