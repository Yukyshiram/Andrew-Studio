<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('import_batches', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('source_sha256', 64)->unique();
            $table->json('manifest');
            $table->timestamp('rolled_back_at')->nullable();
            $table->timestamps();
        });
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['reader', 'librarian', 'admin'])->default('reader')->index();
            $table->unsignedBigInteger('legacy_id')->nullable()->unique();
            $table->foreignUuid('import_batch_id')->nullable()->constrained('import_batches')->restrictOnDelete();
            $table->softDeletes();
        });
        Schema::create('books', function (Blueprint $table) {
            $table->id();
            $table->string('title')->index();
            $table->string('author')->index();
            $table->string('publisher')->index();
            $table->string('publication_year', 50);
            $table->text('description');
            $table->string('category', 80)->default('General')->index();
            $table->string('cover_color', 20)->default('olive');
            $table->unsignedBigInteger('legacy_id')->nullable()->unique();
            $table->foreignUuid('import_batch_id')->nullable()->constrained('import_batches')->restrictOnDelete();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['deleted_at', 'created_at']);
        });
        Schema::create('audit_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 80)->index();
            $table->string('subject_type', 80)->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_events');
        Schema::dropIfExists('books');
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['import_batch_id']);
            $table->dropIndex(['role']);
            $table->dropUnique(['legacy_id']);
            $table->dropColumn(['role', 'legacy_id', 'import_batch_id', 'deleted_at']);
        });
        Schema::dropIfExists('import_batches');
    }
};
