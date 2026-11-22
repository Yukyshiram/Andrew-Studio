<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Http\Middleware\TrustHosts;
use Illuminate\Http\Request;
use Tests\TestCase;

class CanonicalUrlsTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    protected function tearDown(): void
    {
        Request::setTrustedHosts([]);
        TrustHosts::flushState();
        parent::tearDown();
    }

    public function test_password_reset_email_uses_configured_origin_when_host_header_is_untrusted(): void
    {
        $user = User::factory()->make(['email' => 'review@example.test']);
        $expectedUrl = rtrim(config('app.url'), '/').'/reset-password/synthetic-review-token?email=review%40example.test';
        $this->withHeader('Host', 'review-host.invalid:9876')->get('http://review-host.invalid:9876/forgot-password')->assertOk();
        $this->assertSame('review-host.invalid', $this->app['request']->getHost());

        $message = (new ResetPassword('synthetic-review-token'))->toMail($user);

        $this->assertSame($expectedUrl, $message->actionUrl);
    }

    public function test_untrusted_host_returns_400_in_production(): void
    {
        $this->app->instance('env', 'production');

        $response = $this->withHeader('Host', 'review-host.invalid:9876')->get('http://review-host.invalid:9876/forgot-password');

        $response->assertBadRequest();
    }

    public function test_configured_host_renders_password_recovery_in_production(): void
    {
        $this->app->instance('env', 'production');

        $response = $this->get(rtrim(config('app.url'), '/').'/forgot-password');

        $response->assertOk();
    }
}
