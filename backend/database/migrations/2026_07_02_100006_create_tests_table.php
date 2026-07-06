<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('lab_id')->constrained('labs')->cascadeOnDelete();
            $table->uuid('parent_id')->nullable();
            
            $table->string('name');
            $table->string('category'); // CBC, LFT, KFT, Thyroid, etc.
            $table->string('field_type')->default('Single Field'); // "Single Field", "Multiple Field"
            $table->string('type')->default('Pathology');
            $table->decimal('price', 10, 2)->default(0);
            $table->string('unit')->nullable();
            $table->string('gender_ref_type')->default('BOTH'); // BOTH, GENDER_SPECIFIC, CHILDREN, NEWBORN
            
            $table->float('ref_range_min')->nullable();
            $table->float('ref_range_max')->nullable();
            $table->float('ref_range_min_male')->nullable();
            $table->float('ref_range_max_male')->nullable();
            $table->float('ref_range_min_female')->nullable();
            $table->float('ref_range_max_female')->nullable();
            $table->float('ref_range_min_child')->nullable();
            $table->float('ref_range_max_child')->nullable();
            $table->float('ref_range_min_newborn')->nullable();
            $table->float('ref_range_max_newborn')->nullable();
            
            $table->string('value_type')->default('Numeric'); // "Numeric", "Custom"
            $table->json('custom_options')->nullable(); // JSON array of strings
            $table->longText('interpretation')->nullable(); // Rich text HTML
            
            $table->timestamps();
        });

        Schema::table('tests', function (Blueprint $table) {
            $table->foreign('parent_id')->references('id')->on('tests')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tests');
    }
};
