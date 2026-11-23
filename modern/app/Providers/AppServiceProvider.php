<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        URL::forceRootUrl(config('app.url'));
        Model::preventLazyLoading(! app()->isProduction());
        Gate::define('admin', fn (User $user): bool => $user->isAdmin());
        Gate::define('circulate', fn (User $user): bool => $user->canManageBooks());
        foreach (['registration' => 5, 'recovery' => 5, 'sensitive' => 10, 'login-global' => 30] as $name => $attempts) {
            RateLimiter::for($name, fn (Request $request) => Limit::perMinute($attempts)->by($request->ip() ?? 'local'));
        }
        ResetPassword::toMailUsing(function (object $notifiable, string $token): MailMessage {
            $url = route('password.reset', ['token' => $token, 'email' => $notifiable->getEmailForPasswordReset()]);

            return (new MailMessage)->subject('Recupera tu acceso a Bibliotecary')
                ->greeting('Hola, '.$notifiable->name)
                ->line('Recibimos una solicitud para restablecer tu contraseña.')
                ->action('Restablecer contraseña', $url)
                ->line('El enlace caduca en 60 minutos y solo puede utilizarse una vez.')
                ->line('Si no lo solicitaste, puedes ignorar este mensaje.');
        });
    }
}
