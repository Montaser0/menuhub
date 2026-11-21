<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Extra currencies a customer may switch the public menu to.
 *
 * JSON list of currency codes. Rates are fetched automatically (see ExchangeRates); prices are
 * always stored and ordered in their own currency, the conversion is display-only.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('restaurants', function (Blueprint $table) {
            $table->json('display_currencies')->nullable()->after('currency');
        });
    }

    public function down(): void
    {
        Schema::table('restaurants', function (Blueprint $table) {
            $table->dropColumn('display_currencies');
        });
    }
};
