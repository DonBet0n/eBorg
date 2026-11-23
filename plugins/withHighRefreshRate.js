// Expo config plugin: просить Android тримати найвищу частоту оновлення екрана,
// яку підтримує дисплей (120/144 Гц тощо), а не 60/90, які система дає застосункам за замовчуванням.
// Вставляє код у MainActivity під час `expo prebuild`.
const { withMainActivity } = require('expo/config-plugins');
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');

const CALL = `    requestHighestRefreshRate()`;

const METHOD = `  /**
   * Вибирає режим дисплея з максимальною частотою (при поточній роздільній здатності).
   * У простої (статичний екран) система все одно може знижувати частоту — це економія батареї, візуально не помітно.
   */
  private fun requestHighestRefreshRate() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return
    val display = (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) this.display
      else @Suppress("DEPRECATION") windowManager.defaultDisplay) ?: return
    val current = display.mode
    val best = display.supportedModes
      .filter { it.physicalWidth == current.physicalWidth && it.physicalHeight == current.physicalHeight }
      .maxByOrNull { it.refreshRate } ?: return
    val params = window.attributes
    params.preferredDisplayModeId = best.modeId
    window.attributes = params
  }
`;

module.exports = function withHighRefreshRate(config) {
  return withMainActivity(config, (cfg) => {
    if (cfg.modResults.language !== 'kt') {
      throw new Error('withHighRefreshRate: очікується MainActivity на Kotlin');
    }
    let src = cfg.modResults.contents;

    src = mergeContents({
      src,
      newSrc: CALL,
      tag: 'high-refresh-rate-call',
      anchor: /super\.onCreate\(/,
      offset: 1,
      comment: '//',
    }).contents;

    src = mergeContents({
      src,
      newSrc: METHOD,
      tag: 'high-refresh-rate-method',
      anchor: /override fun getMainComponentName/,
      offset: -4,
      comment: '//',
    }).contents;

    cfg.modResults.contents = src;
    return cfg;
  });
};
