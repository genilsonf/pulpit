#!/bin/bash

for pasta in */; do
    novo_nome="${pasta/ - /-}"
    
    if [ "$pasta" != "$novo_nome" ]; then
        mv -- "$pasta" "$novo_nome"
        echo "Renomeado: $pasta -> $novo_nome"
    fi
done
