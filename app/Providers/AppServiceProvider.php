<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Services\PDFService;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(PDFService::class, function ($app) {
            return new PDFService();
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
