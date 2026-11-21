<?php

namespace Modules\Tenancy\Tests;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Modules\Shared\Enums\RestaurantRole;
use Modules\Shared\Tests\ApiTestCase;
use Modules\Tenancy\Services\ExchangeRates;

class TenancyTest extends ApiTestCase
{
    public function test_owner_sees_own_restaurant_with_permissions_and_plan(): void
    {
        [$owner, $restaurant] = $this->makeRestaurant();
        Sanctum::actingAs($owner);

        $this->getJson($this->api("restaurants/{$restaurant->id}"))
            ->assertOk()
            ->assertJsonPath('data.role', 'OWNER')
            ->assertJsonPath('data.plan.plan.slug', 'free');

        $this->getJson($this->api('me/restaurants'))->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_user_cannot_access_a_restaurant_they_do_not_belong_to(): void
    {
        [$ownerA] = $this->makeRestaurant('A');
        [, $restaurantB] = $this->makeRestaurant('B');
        Sanctum::actingAs($ownerA);

        $this->getJson($this->api("restaurants/{$restaurantB->id}"))->assertForbidden();
        $this->getJson($this->api("restaurants/{$restaurantB->id}/products"))->assertForbidden();
    }

    public function test_editor_has_limited_permissions(): void
    {
        [, $restaurant] = $this->makeRestaurant();
        $editor = $this->addStaff($restaurant, RestaurantRole::Editor);
        $category = $this->makeCategory($restaurant);
        $product = $this->makeProduct($category);
        Sanctum::actingAs($editor);

        $this->getJson($this->api("restaurants/{$restaurant->id}/products"))->assertOk();
        $this->deleteJson($this->api("restaurants/{$restaurant->id}/products/{$product->id}"))->assertForbidden();
        $this->postJson($this->api("restaurants/{$restaurant->id}/staff"), [
            'email' => 'new@example.com', 'full_name' => 'New', 'role' => 'MANAGER',
        ])->assertForbidden();
        $this->getJson($this->api("restaurants/{$restaurant->id}/audit-logs"))->assertForbidden();
    }

    public function test_dashboard_update_cannot_change_status_or_business_type(): void
    {
        [$owner, $restaurant] = $this->makeRestaurant();
        Sanctum::actingAs($owner);

        $this->patchJson($this->api("restaurants/{$restaurant->id}"), [
            'name' => 'New name',
            'status' => 'CANCELLED',
            'business_type' => 'SHOP',
            'menu_status' => 'DRAFT',
        ])->assertOk();

        $restaurant->refresh();
        $this->assertSame('New name', $restaurant->name);
        $this->assertSame('ACTIVE', $restaurant->status->value);
        $this->assertSame('RESTAURANT', $restaurant->business_type->value);
        $this->assertSame('PUBLISHED', $restaurant->menu_status->value);
    }

    public function test_owner_picks_display_currencies_and_rates_are_fetched_automatically(): void
    {
        Cache::flush();
        Http::fake([
            '*' => Http::response(['rates' => ['USD' => 1, 'TRY' => 40, 'SAR' => 3.75, 'SYP' => 13000]]),
        ]);
        [$owner, $restaurant] = $this->makeRestaurant();
        $restaurant->forceFill(['currency' => 'USD'])->save();
        Sanctum::actingAs($owner);

        $this->patchJson($this->api("restaurants/{$restaurant->id}"), [
            'display_currencies' => ['TRY', 'USD', 'SAR'],
        ])->assertOk()
            ->assertJsonPath('data.display_currencies', ['TRY', 'SAR'])
            ->assertJsonPath('data.currency_rates.TRY', 40)
            ->assertJsonPath('data.currency_rates.USD', 1)
            ->assertJsonPath('data.currency_rates.SYP', 13000);

        // Rates are cached: a second read does not call the feed again.
        $this->getJson($this->api("restaurants/{$restaurant->id}"))->assertOk();
        Http::assertSentCount(1);

        $this->patchJson($this->api("restaurants/{$restaurant->id}"), ['display_currencies' => ['XXX']])
            ->assertStatus(422);
        $this->patchJson($this->api("restaurants/{$restaurant->id}"), ['display_currencies' => ['TRY', 'TRY']])
            ->assertStatus(422);

        $this->patchJson($this->api("restaurants/{$restaurant->id}"), ['display_currencies' => null])
            ->assertOk()
            ->assertJsonCount(0, 'data.display_currencies')
            ->assertJsonCount(0, 'data.currency_rates');
    }

    public function test_last_known_rates_are_used_when_the_feed_is_down(): void
    {
        Cache::flush();
        Http::fakeSequence()
            ->push(['rates' => ['USD' => 1, 'TRY' => 40]])
            ->push('boom', 500);
        $service = app(ExchangeRates::class);

        $this->assertEquals(40.0, $service->relativeTo('USD')['TRY']);

        Cache::forget('exchange-rates:fresh');
        $this->assertEquals(40.0, $service->relativeTo('USD')['TRY']);
    }
    public function test_reserved_and_taken_slugs_are_refused(): void
    {
        [$owner, $restaurant] = $this->makeRestaurant();
        [, $other] = $this->makeRestaurant('Other');
        Sanctum::actingAs($owner);

        $this->patchJson($this->api("restaurants/{$restaurant->id}"), ['slug' => 'admin'])->assertStatus(422);
        $this->patchJson($this->api("restaurants/{$restaurant->id}"), ['slug' => $other->slug])->assertStatus(422);
        $this->patchJson($this->api("restaurants/{$restaurant->id}"), ['slug' => 'fresh-slug'])->assertOk();
    }

    public function test_suspended_restaurant_is_read_only_for_staff(): void
    {
        [$owner, $restaurant] = $this->makeRestaurant(activate: false);
        Sanctum::actingAs($owner);
        $category = $this->makeCategory($restaurant);

        $this->postJson($this->api("restaurants/{$restaurant->id}/products"), [
            'category_id' => $category->id, 'name_ar' => 'x', 'price' => 5,
        ])->assertForbidden();
    }
}
