let employees = [];
let editingEmployeeId = '';

const employeesList = document.getElementById('employeesList');
const employeeForm = document.getElementById('employeeForm');
const employeeSearch = document.getElementById('employeeSearch');
const employeeSort = document.getElementById('employeeSort');
const employeeRole = document.getElementById('employeeRole');
const employeeFormTitle = document.getElementById('employeeFormTitle');
const employeeFormHint = document.getElementById('employeeFormHint');
const newEmployeeBtn = document.getElementById('newEmployeeBtn');
const clearEmployeeBtn = document.getElementById('clearEmployeeBtn');

function fullName(employee) {
    return `${employee.name || ''} ${employee.surname || ''}`.trim();
}

function filteredEmployees() {
    const text = employeeSearch.value.trim().toLowerCase();
    const role = employeeRole.value;
    const list = employees.filter(employee => {
        const haystack = `${fullName(employee)} ${employee.username || ''}`.toLowerCase();
        const matchesText = !text || haystack.includes(text);
        const matchesRole = !role || employee.role === role;

        return matchesText && matchesRole;
    });

    list.sort((a, b) => {
        if (employeeSort.value === 'name') {
            return fullName(a).localeCompare(fullName(b));
        }

        if (employeeSort.value === 'today') {
            return Number(b.todaySales || 0) - Number(a.todaySales || 0);
        }

        return Number(b.totalSales || 0) - Number(a.totalSales || 0);
    });

    return list;
}

function renderEmployees() {
    const list = filteredEmployees();

    if (!list.length) {
        employeesList.innerHTML = '<div class="empty-state">No hay empleados para mostrar.</div>';
        return;
    }

    employeesList.innerHTML = list.map(employee => {
        const name = fullName(employee) || 'Empleado';
        const role = employee.role === 'administrator' ? 'administrador' : 'empleado';
        const state = employee.state === 'discharged' ? 'off' : 'ok';
        const actionButton = employee.state === 'discharged' 
            ? `<button class="table-action text-success" type="button" data-reactivate="${employee.id}" title="Reactivar">
                    <i class="bi bi-arrow-repeat"></i>
               </button>`
            : `<button class="table-action text-danger" type="button" data-delete="${employee.id}" title="Desactivar">
                    <i class="bi bi-trash3"></i>
               </button>`;

        return `
            <article class="employee-card">
                <img class="employee-photo" src="${App.escapeHtml(App.photoPath(employee.photo, 'assets/photos/profile.png'))}" alt="${App.escapeHtml(name)}">
                <div>
                    <h3>${App.escapeHtml(name)}</h3>
                    <p>@${App.escapeHtml(employee.username || 'usuario')} · ${App.escapeHtml(employee.shift || 'sin turno')}</p>
                    <div class="product-meta">
                        <span class="status-pill ${state}">${App.escapeHtml(role)}</span>
                        <span class="status-pill">hoy ${App.money(employee.todaySales)}</span>
                        <span class="status-pill">total ${App.money(employee.totalSales)}</span>
                    </div>
                </div>
                <div class="employee-actions">
                    <button class="table-action" type="button" data-edit="${employee.id}" title="Editar">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                    ${actionButton}
                    <button class="table-action" type="button" data-sales="${employee.id}" title="Ventas">
                        <i class="bi bi-receipt"></i>
                    </button>
                </div>
            </article>
        `;
    }).join('');
}

function resetForm() {
    editingEmployeeId = '';
    employeeForm.reset();
    employeeForm.elements.id.value = '';
    employeeForm.elements.Password.setAttribute('required', 'required');
    employeeForm.elements.Phone.setAttribute('required', 'required');
    employeeFormTitle.textContent = 'Nuevo empleado';
    employeeFormHint.textContent = 'Completa los datos para registrar una cuenta.';
}

function editEmployee(id) {
    const employee = employees.find(item => String(item.id) === String(id));

    if (!employee) {
        return;
    }

    editingEmployeeId = String(employee.id);
    employeeForm.elements.id.value = editingEmployeeId;
    employeeForm.elements.Name.value = employee.name || '';
    employeeForm.elements.Surname.value = employee.surname || '';
    employeeForm.elements.Username.value = employee.username || '';
    employeeForm.elements.Shift.value = employee.shift || '';
    employeeForm.elements.Phone.value = employee.phone || '';
    employeeForm.elements.Password.value = '';
    employeeForm.elements.PhotoFile.value = '';
    employeeForm.elements.Admin.checked = employee.role === 'administrator';
    employeeForm.elements.Password.removeAttribute('required');
    employeeForm.elements.Phone.removeAttribute('required');    
    employeeFormTitle.textContent = 'Editar empleado';
    employeeFormHint.textContent = fullName(employee) || employee.username || 'Empleado seleccionado';
}

async function deleteEmployee(id) {
    const employee = employees.find(item => String(item.id) === String(id));
    const confirmMessage = `¿Estás seguro de que deseas desactivar a ${fullName(employee) || 'este empleado'}?\n\nEl empleado ya no podrá iniciar sesión ni registrar ventas.`;

    if (!confirm(confirmMessage)) {
        return;
    }

    try {
        await App.request('employee', {
            method: 'DELETE',
            params: { id: id }
        });
        App.notify(`Empleado ${fullName(employee)} desactivado.`, 'success');
        await loadEmployees();
        
        // If the edited employee was deleted, reset the form
        if (editingEmployeeId === String(id)) {
            resetForm();
        }
    } catch (error) {
        App.notify(error.message, 'error');
    }
}

async function reactivateEmployee(id) {
    const employee = employees.find(item => String(item.id) === String(id));
    const confirmMessage = `¿Estás seguro de que deseas reactivar a ${fullName(employee) || 'este empleado'}?\n\nEl empleado podrá volver a iniciar sesión.`;

    if (!confirm(confirmMessage)) {
        return;
    }

    try {
        await App.request('employee', {
            method: 'PATCH',
            params: { id: id }
        });
        App.notify(`Empleado ${fullName(employee)} reactivado.`, 'success');
        await loadEmployees();
    } catch (error) {
        App.notify(error.message, 'error');
    }
}

async function employeePayload(isEdit) {
    const payload = {
        Name: App.field(employeeForm, 'Name'),
        Surname: App.field(employeeForm, 'Surname'),
        Username: App.field(employeeForm, 'Username'),
        Shift: App.field(employeeForm, 'Shift')
    };

    const phone = App.field(employeeForm, 'Phone');
    const password = App.field(employeeForm, 'Password');
    const photoFile = employeeForm.elements.PhotoFile.files[0];

    if (!isEdit || phone) {
        payload.Phone = phone;
    }

    if (!isEdit || password) {
        payload.Password = password;
    }

    if (photoFile) {
        payload.Photo = await App.uploadPhoto('employees', photoFile);
    }

    if (isEdit) {
        payload.Admin = employeeForm.elements.Admin.checked ? 1 : 0;
    }

    return payload;
}

async function saveEmployee(event) {
    event.preventDefault();

    const isEdit = Boolean(editingEmployeeId);
    const payload = await employeePayload(isEdit);

    if (!isEdit && (!payload.Phone || !payload.Password)) {
        App.notify('Teléfono y contraseña son obligatorios.', 'error');
        return;
    }

    try {
        if (isEdit) {
            await App.request('employee', {
                method: 'PUT',
                params: { id: editingEmployeeId },
                body: payload
            });
            App.notify('Empleado actualizado.', 'success');
        } else {
            await App.request('employee', {
                method: 'POST',
                body: payload
            });
            App.notify('Empleado registrado.', 'success');
        }

        resetForm();
        await loadEmployees();
    } catch (error) {
        App.notify(error.message, 'error');
    }
}

async function showEmployeeSales(id) {
    const employee = employees.find(item => String(item.id) === String(id));

    try {
        const sales = App.toArray(await App.request('salesbyemployee', { params: { id } }));
        const total = sales.reduce((sum, sale) => sum + Number(sale.amount || 0), 0);
        App.notify(`${fullName(employee)}: ${sales.length} tickets, ${App.money(total)}.`, 'success');
    } catch (error) {
        if (error.status === 404) {
            App.notify(`${fullName(employee)} no tiene ventas registradas.`, 'info');
            return;
        }

        App.notify(error.message, 'error');
    }
}

async function loadEmployees() {
    App.setLoading(employeesList, 'Cargando empleados...');

    try {
        employees = App.toArray(await App.request('employee'));
        renderEmployees();
    } catch (error) {
        App.setError(employeesList, error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    employeeForm.addEventListener('submit', saveEmployee);
    newEmployeeBtn.addEventListener('click', resetForm);
    clearEmployeeBtn.addEventListener('click', resetForm);
    [employeeSearch, employeeSort, employeeRole].forEach(control => {
        control.addEventListener('input', renderEmployees);
        control.addEventListener('change', renderEmployees);
    });
    employeesList.addEventListener('click', event => {
        const editButton = event.target.closest('[data-edit]');
        const deleteButton = event.target.closest('[data-delete]');
        const reactivateButton = event.target.closest('[data-reactivate]');
        const salesButton = event.target.closest('[data-sales]');

        if (editButton) {
            editEmployee(editButton.dataset.edit);
        }

        if (deleteButton) {
            deleteEmployee(deleteButton.dataset.delete);
        }

        if (reactivateButton) {
            reactivateEmployee(reactivateButton.dataset.reactivate);
        }

        if (salesButton) {
            showEmployeeSales(salesButton.dataset.sales);
        }
    });

    resetForm();
    loadEmployees();
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
