let inventory = [];
let editingProductCode = '';

const inventoryList = document.getElementById('inventoryList');
const inventorySearch = document.getElementById('inventorySearch');
const inventoryCategory = document.getElementById('inventoryCategory');
const inventoryState = document.getElementById('inventoryState');
const productForm = document.getElementById('productForm');
const newProductBtn = document.getElementById('newProductBtn');
const clearProductBtn = document.getElementById('clearProductBtn');
const productDiscontinuedRow = document.getElementById('productDiscontinuedRow');

function codeOf(product) {
    return product.code || product.Code || '';
}

function stateOf(product) {
    const state = (product.state || product.State || '').toLowerCase();

    if (state === 'discontinued') {
        return 'discontinued';
    }

    if (Number(product.amount ?? product.Amount ?? 0) <= 0 || state === 'soldout') {
        return 'soldout';
    }

    return 'available';
}

function stateLabel(state) {
    const labels = {
        available: 'disponible',
        soldout: 'agotado',
        discontinued: 'descontinuado'
    };

    return labels[state] || state;
}

function stateClass(state) {
    if (state === 'available') {
        return 'ok';
    }

    if (state === 'soldout') {
        return 'warn';
    }

    return 'off';
}

function categoryId(type) {
    const categories = {
        'White bread': 1,
        'Sweet Bread': 2,
        Cakes: 3
    };

    return categories[type] || 1;
}

function filteredInventory() {
    const text = inventorySearch.value.trim().toLowerCase();
    const category = inventoryCategory.value;
    const state = inventoryState.value;

    return inventory.filter(product => {
        const name = (product.name || product.Name || '').toLowerCase();
        const code = codeOf(product).toLowerCase();
        const type = product.type || product.Type || '';
        const currentState = stateOf(product);

        return (!text || name.includes(text) || code.includes(text))
            && (!category || type === category)
            && (!state || currentState === state);
    });
}

function renderCategoryFilter() {
    const current = inventoryCategory.value;
    const categories = [...new Set(inventory.map(product => product.type || product.Type).filter(Boolean))].sort();

    inventoryCategory.innerHTML = '<option value="">Todas las categorias</option>';
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        inventoryCategory.appendChild(option);
    });
    inventoryCategory.value = current;
}

function renderInventory() {
    const list = filteredInventory();

    if (!list.length) {
        inventoryList.innerHTML = '<div class="empty-state">No hay productos para mostrar.</div>';
        return;
    }

    inventoryList.innerHTML = list.map(product => {
        const code = codeOf(product);
        const name = product.name || product.Name || 'Producto';
        const price = Number(product.price ?? product.Price ?? 0);
        const amount = Number(product.amount ?? product.Amount ?? 0);
        const type = product.type || product.Type || 'Sin categoria';
        const state = stateOf(product);
        const css = stateClass(state);
        const discontinued = state === 'discontinued';
        
        const actionButton = discontinued
            ? `<button class="table-action text-success" type="button" data-reactivate="${App.escapeHtml(code)}" title="Reactivar">
                    <i class="bi bi-arrow-repeat"></i>
               </button>`
            : `<button class="table-action text-danger" type="button" data-delete="${App.escapeHtml(code)}" title="Descontinuar">
                    <i class="bi bi-trash3"></i>
               </button>`;

        return `
            <article class="product-card ${App.escapeHtml(css)}">
                <img class="product-photo" src="${App.escapeHtml(App.productPhoto(product))}" alt="${App.escapeHtml(name)}">
                <div>
                    <h3>${App.escapeHtml(name)}</h3>
                    <p>${App.escapeHtml(product.description || product.Description || '')}</p>
                    <div class="product-meta">
                        <span class="status-pill">${App.escapeHtml(code)}</span>
                        <span class="status-pill ${App.escapeHtml(css)}">${App.escapeHtml(stateLabel(state))}</span>
                        <span class="status-pill">${App.escapeHtml(type)}</span>
                        <span class="status-pill">${amount} piezas</span>
                        <span class="status-pill">${App.money(price)}</span>
                    </div>
                </div>
                <div class="product-actions">
                    <button class="table-action" type="button" data-edit="${App.escapeHtml(code)}" title="Editar">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                    ${actionButton}
                    <button class="table-action" type="button" data-stock="dec" data-code="${App.escapeHtml(code)}" title="Restar" ${amount <= 0 || discontinued ? 'disabled' : ''}>
                        <i class="bi bi-dash"></i>
                    </button>
                    <button class="table-action" type="button" data-stock="inc" data-code="${App.escapeHtml(code)}" title="Sumar" ${discontinued ? 'disabled' : ''}>
                        <i class="bi bi-plus"></i>
                    </button>
                </div>
            </article>
        `;
    }).join('');
}

function resetProductForm() {
    editingProductCode = '';
    productForm.reset();
    productForm.elements.Code.readOnly = false;
    productForm.elements.Amount.disabled = false;
    productForm.elements.Amount.required = true;
    productForm.elements.Discontinued.checked = false;
    productDiscontinuedRow.hidden = true;
    document.getElementById('productFormTitle').textContent = 'Nuevo producto';
    document.getElementById('productFormHint').textContent = 'Registra productos usando las categorias disponibles.';
}

function editProduct(code) {
    const product = inventory.find(item => codeOf(item) === code);

    if (!product) {
        return;
    }

    editingProductCode = code;
    productForm.reset();
    productForm.elements.Code.value = code;
    productForm.elements.Code.readOnly = true;
    productForm.elements.Category.value = categoryId(product.type || product.Type || '');
    productForm.elements.Name.value = product.name || product.Name || '';
    productForm.elements.Description.value = product.description || product.Description || '';
    productForm.elements.Price.value = Number(product.price ?? product.Price ?? 0);
    productForm.elements.Amount.value = Number(product.amount ?? product.Amount ?? 0);
    productForm.elements.Amount.disabled = true;
    productForm.elements.Amount.required = false;
    productForm.elements.PhotoFile.value = '';
    productForm.elements.Discontinued.checked = stateOf(product) === 'discontinued';
    productDiscontinuedRow.hidden = false;
    document.getElementById('productFormTitle').textContent = 'Editar producto';
    document.getElementById('productFormHint').textContent = product.name || product.Name || code;
}

async function deleteProduct(code) {
    const product = inventory.find(item => codeOf(item) === code);
    const productName = product.name || product.Name || 'este producto';
    const confirmMessage = `¿Estás seguro de que deseas descontinuar ${productName}?\n\nEl producto ya no aparecerá en el catálogo de ventas.`;

    if (!confirm(confirmMessage)) {
        return;
    }

    try {
        await App.request('product', {
            method: 'DELETE',
            params: { id: code }
        });
        App.notify(`Producto ${productName} descontinuado.`, 'success');
        await loadInventory();
        
        // If the edited product was deleted, reset the form
        if (editingProductCode === code) {
            resetProductForm();
        }
    } catch (error) {
        App.notify(error.message, 'error');
    }
}

async function reactivateProduct(code) {
    const product = inventory.find(item => codeOf(item) === code);
    const productName = product.name || product.Name || 'este producto';
    const confirmMessage = `¿Estás seguro de que deseas reactivar ${productName}?\n\nEl producto volverá a estar disponible en el catálogo.`;

    if (!confirm(confirmMessage)) {
        return;
    }

    try {
        await App.request('product', {
            method: 'PATCH',
            params: { id: code }
        });
        App.notify(`Producto ${productName} reactivado.`, 'success');
        await loadInventory();
    } catch (error) {
        App.notify(error.message, 'error');
    }
}

function productPayload(isEdit) {
    const payload = {
        Code: App.field(productForm, 'Code'),
        Name: App.field(productForm, 'Name'),
        Description: App.field(productForm, 'Description'),
        Price: Number(App.field(productForm, 'Price')),
        Category: Number(App.field(productForm, 'Category'))
    };

    if (isEdit) {
        payload.Discontinued = productForm.elements.Discontinued.checked;
    } else {
        payload.Amount = Number(App.field(productForm, 'Amount'));
    }

    return payload;
}

async function saveProduct(event) {
    event.preventDefault();

    const isEdit = Boolean(editingProductCode);
    const payload = productPayload(isEdit);

    if (!payload.Code || !payload.Name || !payload.Description || Number.isNaN(payload.Price) || (!isEdit && Number.isNaN(payload.Amount))) {
        App.notify('Completa los datos del producto.', 'error');
        return;
    }

    try {
        const photoFile = productForm.elements.PhotoFile.files[0];

        if (isEdit) {
            if (photoFile) {
                payload.Photo = await App.uploadPhoto('products', photoFile);
            }

            const { Code, Amount, ...updatePayload } = payload;
            await App.request('product', {
                method: 'PUT',
                params: { id: editingProductCode },
                body: updatePayload
            });
            App.notify('Producto actualizado.', 'success');
        } else {
            const { Discontinued, ...createPayload } = payload;
            await App.request('product', {
                method: 'POST',
                body: createPayload
            });

            if (photoFile) {
                const photo = await App.uploadPhoto('products', photoFile);
                await App.request('product', {
                    method: 'PUT',
                    params: { id: payload.Code },
                    body: { Photo: photo }
                });
            }

            App.notify('Producto registrado.', 'success');
        }

        resetProductForm();
        await loadInventory();
    } catch (error) {
        App.notify(error.message, 'error');
    }
}

async function changeStock(code, action) {
    try {
        const options = {
            method: 'PUT',
            params: { id: code }
        };

        if (action === 'dec') {
            options.params.amount = 1;
        }

        await App.request(action === 'inc' ? 'incproduct' : 'decproduct', options);
        App.notify('Stock actualizado.', 'success');
        await loadInventory();
    } catch (error) {
        App.notify(error.message, 'error');
    }
}

async function loadInventory() {
    App.setLoading(inventoryList, 'Cargando inventario...');

    try {
        inventory = App.toArray(await App.request('product'));
        renderCategoryFilter();
        renderInventory();
    } catch (error) {
        App.setError(inventoryList, error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    productForm.addEventListener('submit', saveProduct);
    newProductBtn.addEventListener('click', resetProductForm);
    clearProductBtn.addEventListener('click', resetProductForm);
    [inventorySearch, inventoryCategory, inventoryState].forEach(control => {
        control.addEventListener('input', renderInventory);
        control.addEventListener('change', renderInventory);
    });
    inventoryList.addEventListener('click', event => {
        const stockButton = event.target.closest('[data-stock]');
        const editButton = event.target.closest('[data-edit]');
        const deleteButton = event.target.closest('[data-delete]');
        const reactivateButton = event.target.closest('[data-reactivate]');

        if (stockButton) {
            changeStock(stockButton.dataset.code, stockButton.dataset.stock);
        }

        if (editButton) {
            editProduct(editButton.dataset.edit);
        }

        if (deleteButton) {
            deleteProduct(deleteButton.dataset.delete);
        }

        if (reactivateButton) {
            reactivateProduct(reactivateButton.dataset.reactivate);
        }
    });

    resetProductForm();
    loadInventory();
});

/* 
============================================================================================================
============================================================================================================
Code made by Francisco Emmanuel Luna Hidalgo Last checked 18/05/2026 
============================================================================================================
============================================================================================================
Instituto Tecnológico de Pachuca, Ingeniería en Sistemas Computacionales, Programación Web, proyecto final
============================================================================================================
============================================================================================================
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%%%%%%%%%%##%%%%%%%%%%@@@@@@@@@@@@@@@@@@@@@@@@@@@
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%%%#*++++++++++++++++++++++++++++*#%%%%%%@@@@@@@@@@@@@@@@@
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%#*+++++++++++++++++++++++++++++++++++++++++++*##%%%@@@@@@@@@@@
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%+++++++++++++++++++++++++++++++++++++++++++++++++++++*#%%@@@@@@@
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@%%@@@@@#+++++++++++++++++++++++++++++++++++++++++++++++++++++++%@@@@@@@
    @@@@@@@@@@@@@@@@@@@@@@@@@@%%#+#%@@@@%*++++##+++++++++++++++++++++++++++++++++++++++++++++++%%@@@@@@@
    @@@@@@@@@@@@@@@@@@@@@@@%%*+++++%%@@@@%*+++%@@@%#*+++++++++++++++++++++++++++++++++++++++++#%@@@@@@@@
    @@@@@@@@@@@@@@@@@@@@@%#++++++++*%@@@@@%*++%@@@@@@@%#+++++++++++++++++++++++++++++++++++++*%@@@@@@@@@
    @@@@@@@@@@@@@@@@@@@%#++++++++++=#%@@@@@@#+%@@@@@@@@@@%#++++++++++++++++++++++++++++++++++%@@@@@@@@@@
    @@@@@@@@@@@@@@@@@%#++++++++++++++%@@@@@@@%%@@@@@@@@@@@@%%*++++++++++++++++++++++++++++++#%@@@@@@@@@@
    @@@@@@@@@@@@@@@%#++++++++++++++++*%@@@@@@@@@@@@@@@@@@@@@@@%#*++++++++++++++++++++++++++*%@@@@@@@@@@@
    @@@@@@@@@@@@@%%*++++++++++++++++++#%@@@@@@@@@@@@@@@@@@@@@@@@@%#+++++++++++++++++++++++*%@@@@@@@@@@@@
    @@@@@@@@@@@@%#+++++++++++++++++++++%%@@@@@@@@@@@@@@@@@@@@@@@@@@%%*++++++++++++++++++++#%@@@@@@@@@@@@
    @@@@@@@@@@@%*+++++++++++++++++++++++%@@@@@@@@@@@@@@@@@@@@@@@@@@@@%%#+++++++++++++++++#%@@@@@@@@@@@@@
    @@@@@@@@@@%+++++++++++++++++++++++++*%@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%#++++++++++++++*%@@@@@@@@@@@@@@
    @@@@@@@@%#+++++++++++++++++++++++++++#%@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%#++++++++++++%@@@@@@@@@@@@@@@
    @@@@@@@%%+++++++++++++++++++++++++++++%@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%#*++++++++#%@@@@@@@@@@@@@@@
    @@@@@@%%++++++++++++++++++++++++++++++*%@@@@@@@@@@@@@@%%%%%%%%%%%%%%%%@@@@%%##+--*%%@@@@@@@@@@@@@@@@
    @@@@@@%+++++++++++++++++++++++++++++++#%++*#%@@@@%%##*++++++++++++++++*#%%%%=...-=.=%@@@@@@@@@@@@@@@
    @@@@@%*+++++++++++++++++++++++++++++**:-+...-#%#*+++++++++++++++++++++++++##...:*...#@@@@@@@@@@@@@@@
    @@@@%*++++++++++++++++++++++++++++++#-..:+...=%+++++++++++++++++++++++++++*%:..*...:%@@@@@@@@@@@@@@@
    @@@%#+++++++++++++++++++++++++++++++#=...-=..+#++++++++++++++++++++++++++++#%++-..+%@@@@@@@@@@@@@@@@
    @@@%+++++++++++++++++++++++++++++**#%%+:..-**#+++++++++++++++++++++++++++++++*####**#%@@@@@@@@@@@@@@
    @@%#+++++++++++++++++++++++++*#%%@@@%#*#%#%#++++++++++++++++++++++++++++++++++++++++++#%@@@@@@@@@@@@
    @@%++++++++++++++++++++++*#%%@@@@@@%++++++++++++++++++++++++++++++++++++++=+===========*%@@@@@@@@@@@
    @%#+++++++++++++++++++*%%@@@@@@@@%+-=++++++++++++++++++++++++++++++++++++++=:...........:#@@@@@@@@@@
    @%*+++++++++++++++*#%@@@@@@@@@@@%+....-=++++++++++++++++++++=--==++++++++++++=-..........:*%@@@@@@@@
    @%++++++++++++++#%@@@@@@@@@@@@@%+........:=+++++++++++++++++++=.....:-==++++++++=..........#%@@@@@@@
    %#+++++++++++*%@@@@@@@@@@@@@@@%*.............:-===++++++++++++++-.................:-++=:....%@@@@@@@
    %#+++++++++#@@@@@@@@@@@@@@@@@@#:............:-::...::--===+++++++=-....................-*:..-%@@@@@@
    %#+++++=*%@@@@@@@@@@@@@@@@@@@%=..  ......:*=....................................+%@@%+...-:..+@@@@@@
    %#++++++++****#%@@@@@@@@@@@@@#:.     ....+.....:=*#*=:....  .... .....      ..+@@@#.:#@-.....-%@@@@@
    %*+++++++++*#%@@@@@@@@@@@@@@%+.. .   ...::...=@@@@=:-+%*:.                  .*@@@@@+..*@:....:#@@@@@
    %*=+++*##%%@@@@@@@@@@@@@@@@@%=..      ......#@@@@@#....-%+...   .        ...+@@@@@@%..:@#.....*%@@@@
    %%%%%@@@@@@@@@@@@@@@@@@@@@@@%=..      .....#@@@@@@@:.....#*..            ..-@@@@@*:*...*%.....+%@@@@
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@%=..         .-@@@@@@%*=.....:#*.           ...%@#=.:=#*...=@:. ..+%@@@@
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@%=...        .*@@@#-.:*=......:@+...         .++.:*@@@@-...-@:. ..+%@@@@
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@%+...  .     .#%:.:#@@@=...  ..+@:..         .#@@@@@@@%....=@:....+%@@@@
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@*..         :#+#@@@@@@:...  ...%*..        .-%@@@@@@@=.  .+%.....*@@@@@
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@#-..        :#@@@@@@@#....  ...=#:.       ..=@@@@@@@#.. ..*+....:#@@@@@
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@+.         .#@@@@@@@=.     ....%-.      ...+@@@@@@%..  ..%:....-%@@@@@
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%:.......  .*@@@@@@#:.     ....*=.      ...*@@@@@%......-*.....*@@@@@@
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@#.......  .+@@@@@@:..      . .==. .     ..*@@@@+... ...+:....-%@@@@@@
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%#......  .:@@@@@....   .    .-=.     . ..#@@+........:=.....%%@@@@@@
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%*:..... ..#@%+.....       ..:=.       ..=:..:::::::-=:....==--#%@@@
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@#:.......-+::---===++==+++++-..........:--:::....... ......:*%@@@@
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%=............................ ...................   ....-%@@@@@@
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%*:......     ..-*+-:....................     .   ....:#%@@@@@@@
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%*:.......  ...:+-:=+*#%%%###***++++..............:+%@@@@@@@@@
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%*:............=#-............:*-.............:*%@@@@@@@@@@@
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%%=............=#*:......:+#-.............-#%@@@@@@@@@@@@@
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%#=:...........=+****+-............:=#%@@@@@@@@@@@@@@@@
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%#+-:......................-+#%@@@@@@@@@@@@@@@@@@@@
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%%%%#*+=-::::::-=+#%%%%@@@@@@@@@@@@@@@@@@@@@@@@
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%+**##%%%@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
============================================================================================================
============================================================================================================
*/
