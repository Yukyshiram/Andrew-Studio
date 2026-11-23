<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('acquisitions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('book_id')->constrained()->restrictOnDelete();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->enum('status', ['announced', 'ordered', 'in_transit', 'incorporated', 'cancelled'])->default('announced');
            $table->date('publication_on')->nullable();
            $table->date('expected_on')->nullable();
            $table->date('incorporated_on')->nullable();
            $table->boolean('is_fictional')->default(false);
            $table->string('source_url', 500)->nullable();
            $table->text('public_note')->nullable();
            $table->uuid('operation_key')->unique();
            $table->char('creation_fingerprint', 64);
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();
            $table->index(['status', 'expected_on']);
            $table->index(['status', 'incorporated_on']);
            $table->index('publication_on');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('acquisitions');
    }
};
