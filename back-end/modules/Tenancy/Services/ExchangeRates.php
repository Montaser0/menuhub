<?php

namespace Modules\Tenancy\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Exchange rates used to show the public menu in another currency.
 *
 * Rates come from a free public feed (units of each currency per 1 USD), are cached for a few
 * hours and, when the feed is down, the last good copy is served instead. Nothing here touches
 * stored prices: it is display-only.
 */
class ExchangeRates
{
    private const FRESH_KEY = 'exchange-rates:fresh';

    private const STALE_KEY = 'exchange-rates:stale';

    /**
     * Units of every supported currency per 1 unit of $base, e.g. ['TRY' => 38.5, 'USD' => 1.0].
     * Empty when no rate has ever been fetched.
     *
     * @return array<string, float>
     */
    public function relativeTo(string $base): array
    {
        $perUsd = $this->perUsd();
        $baseRate = $perUsd[$base] ?? null;

        if (! $baseRate) {
            return [];
        }

        $rates = [];
        foreach ($perUsd as $code => $rate) {
            $rates[$code] = $rate / $baseRate;
        }

        return $rates;
    }

    /** @return array<string, float> units per 1 USD, limited to the supported currencies */
    private function perUsd(): array
    {
        $fresh = Cache::get(self::FRESH_KEY);
        if (is_array($fresh)) {
            return $fresh;
        }

        $fetched = $this->fetch();
        if ($fetched) {
            Cache::put(self::FRESH_KEY, $fetched, now()->addSeconds((int) config('menuhub.exchange_rates.ttl')));
            Cache::forever(self::STALE_KEY, $fetched);

            return $fetched;
        }

        // Feed unreachable: keep serving the last known rates, and retry shortly.
        $stale = Cache::get(self::STALE_KEY);
        $stale = is_array($stale) ? $stale : [];
        Cache::put(self::FRESH_KEY, $stale, now()->addMinutes(5));

        return $stale;
    }

    /** @return array<string, float> */
    private function fetch(): array
    {
        try {
            $response = Http::timeout(5)->acceptJson()->get(config('menuhub.exchange_rates.url'));
            $table = $response->successful() ? $response->json('rates') : null;
        } catch (Throwable) {
            return [];
        }

        if (! is_array($table)) {
            return [];
        }

        $rates = [];
        foreach (config('menuhub.currencies') as $code) {
            $rate = $table[$code] ?? null;
            if (is_numeric($rate) && (float) $rate > 0) {
                $rates[$code] = (float) $rate;
            }
        }

        return $rates;
    }
}
